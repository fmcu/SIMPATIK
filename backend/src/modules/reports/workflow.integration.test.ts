import assert from "node:assert/strict";
import test from "node:test";
import type { ReportStatus } from "@prisma/client";

import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { ReportDetail, ReportRepository } from "./report.repository.js";
import { ReportService } from "./report.service.js";

type Transition = {
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  actorId: string;
  note: string | null;
};

function createWorkflowRepository(initialStatus: ReportStatus): {
  repository: ReportRepository;
  getReport: () => ReportDetail;
  transitions: Transition[];
  auditEvents: string[];
} {
  let currentStatus = initialStatus;
  let version = 1;
  const transitions: Transition[] = [];
  const auditEvents: string[] = [];
  const now = () => new Date();
  const getReport = (): ReportDetail => ({
    id: "report-1",
    uptId: "upt-a",
    periodId: "period-1",
    reportType: "BULANAN",
    status: currentStatus,
    version,
    createdAt: now(),
    updatedAt: now(),
    submittedAt:
      currentStatus === "SUBMITTED" || currentStatus === "REVIEWED" || currentStatus === "APPROVED"
        ? now()
        : null,
    reviewedAt: currentStatus === "REVIEWED" || currentStatus === "APPROVED" ? now() : null,
    approvedAt: currentStatus === "APPROVED" ? now() : null,
    reviewedBy:
      currentStatus === "REVIEWED" || currentStatus === "APPROVED"
        ? { id: "kanwil-1", name: "Kanwil" }
        : null,
    approvedBy: currentStatus === "APPROVED" ? { id: "owner-1", name: "Owner" } : null,
    upt: { id: "upt-a", code: "UPT-A", name: "UPT A" },
    period: {
      id: "period-1",
      name: "Periode",
      startDate: now(),
      dueDate: now(),
      status: "ACTIVE",
    },
    createdBy: { id: "petugas-1", name: "Petugas" },
    _count: { items: 1 },
    items: [
      {
        id: "item-1",
        indicatorId: "indicator-1",
        value: "10",
        narrative: "Lengkap",
        indicator: {
          id: "indicator-1",
          periodId: "period-1",
          code: "IND-1",
          name: "Indikator",
          required: true,
          order: 1,
          inputConfig: {},
          approvalStatus: "APPROVED",
        },
      },
    ],
    attachments: [],
    comments: [],
    histories: transitions.map((item, index) => ({
      id: `history-${index}`,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      note: item.note,
      createdAt: now(),
      actor: { id: item.actorId, name: item.actorId },
    })),
  });
  const transition = (toStatus: ReportStatus, actorId: string, note: string | null) => {
    const fromStatus = currentStatus;
    currentStatus = toStatus;
    transitions.push({ fromStatus, toStatus, actorId, note });
    auditEvents.push(`${fromStatus ?? "NONE"}:${toStatus}:${actorId}`);
  };
  const repository: ReportRepository = {
    list: async () => ({ items: [], total: 0 }),
    findById: async () => getReport(),
    history: async () => ({ items: getReport().histories, total: transitions.length }),
    findCreationContext: async () => ({ period: null, upt: null }),
    exists: async () => false,
    createDraft: async () => getReport(),
    updateDraft: async ({ actorId }) => {
      version += 1;
      auditEvents.push(`UPDATE:${actorId}`);
      return getReport();
    },
    submit: async ({ actorId, validate }) => {
      if (currentStatus !== "DRAFT" && currentStatus !== "REVISION_REQUIRED")
        return "INVALID_STATUS";
      await validate(getReport());
      transition("SUBMITTED", actorId, null);
      return getReport();
    },
    addReviewComment: async ({ actorId, message }) => {
      if (currentStatus !== "SUBMITTED") return "INVALID_STATUS";
      auditEvents.push(`COMMENT:${actorId}`);
      const report = getReport();
      report.comments.push({
        id: "comment-1",
        message,
        createdAt: now(),
        createdBy: { id: actorId, name: actorId },
      });
      return report;
    },
    requestRevision: async ({ actorId, message }) => {
      if (currentStatus !== "SUBMITTED") return "INVALID_STATUS";
      transition("REVISION_REQUIRED", actorId, message);
      return getReport();
    },
    markReviewed: async ({ actorId }) => {
      if (currentStatus !== "SUBMITTED") return "INVALID_STATUS";
      transition("REVIEWED", actorId, null);
      return getReport();
    },
    approve: async ({ actorId }) => {
      if (currentStatus !== "REVIEWED") return "INVALID_STATUS";
      transition("APPROVED", actorId, null);
      return getReport();
    },
  };
  return { repository, getReport, transitions, auditEvents };
}

const audit: AuditRepository = {
  write: async () => undefined,
};

test("workflow completes the valid revision and approval cycle with actor and note history", async () => {
  const state = createWorkflowRepository("DRAFT");
  const service = new ReportService(state.repository, { validate: async () => [] });

  await service.submit("report-1", "upt-a", "coordinator-1");
  await service.addReviewComment("report-1", "kanwil-1", "Lengkapi bukti.");
  await service.requestRevision("report-1", "kanwil-1", "Lengkapi bukti.");
  await service.submit("report-1", "upt-a", "coordinator-1");
  await service.markReviewed("report-1", "kanwil-1");
  const approved = await service.approve("report-1", "owner-1");

  assert.equal(approved.status, "APPROVED");
  assert.deepEqual(
    state.transitions.map(({ fromStatus, toStatus }) => [fromStatus, toStatus]),
    [
      ["DRAFT", "SUBMITTED"],
      ["SUBMITTED", "REVISION_REQUIRED"],
      ["REVISION_REQUIRED", "SUBMITTED"],
      ["SUBMITTED", "REVIEWED"],
      ["REVIEWED", "APPROVED"],
    ],
  );
  assert.equal(state.transitions[1]?.note, "Lengkapi bukti.");
  assert.deepEqual(
    state.transitions.map((item) => item.actorId),
    ["coordinator-1", "kanwil-1", "coordinator-1", "kanwil-1", "owner-1"],
  );
  void audit;
});

test("workflow rejects every invalid source status", async () => {
  const statuses: ReportStatus[] = [
    "DRAFT",
    "SUBMITTED",
    "REVISION_REQUIRED",
    "REVIEWED",
    "APPROVED",
  ];
  for (const status of statuses) {
    const submit = new ReportService(createWorkflowRepository(status).repository, {
      validate: async () => [],
    });
    const submitAllowed = status === "DRAFT" || status === "REVISION_REQUIRED";
    if (submitAllowed) await submit.submit("report-1", "upt-a", "coordinator-1");
    else {
      await assert.rejects(
        () => submit.submit("report-1", "upt-a", "coordinator-1"),
        (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
      );
    }

    const revisionState = createWorkflowRepository(status);
    const revision = new ReportService(revisionState.repository);
    if (status === "SUBMITTED") await revision.requestRevision("report-1", "kanwil-1", "Catatan");
    else {
      await assert.rejects(
        () => revision.requestRevision("report-1", "kanwil-1", "Catatan"),
        (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
      );
    }

    const reviewedState = createWorkflowRepository(status);
    const reviewed = new ReportService(reviewedState.repository);
    if (status === "SUBMITTED") await reviewed.markReviewed("report-1", "kanwil-1");
    else {
      await assert.rejects(
        () => reviewed.markReviewed("report-1", "kanwil-1"),
        (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
      );
    }

    const approvalState = createWorkflowRepository(status);
    const approval = new ReportService(approvalState.repository);
    if (status === "REVIEWED") await approval.approve("report-1", "owner-1");
    else {
      await assert.rejects(
        () => approval.approve("report-1", "owner-1"),
        (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
      );
    }
  }
});

test("workflow keeps report content locked outside editable statuses", async () => {
  for (const status of ["SUBMITTED", "REVIEWED", "APPROVED"] as const) {
    const service = new ReportService(createWorkflowRepository(status).repository);
    await assert.rejects(
      () =>
        service.update("report-1", {
          version: 1,
          items: [{ indicatorId: "indicator-1", value: "ubah" }],
          uptScopeId: "upt-a",
          actorId: "user-1",
        }),
      (error: unknown) => error instanceof AppError && error.code === "REPORT_LOCKED",
    );
  }
});
