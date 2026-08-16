import assert from "node:assert/strict";
import test from "node:test";
import type { ReportStatus } from "@prisma/client";

import { AppError } from "../../middleware/error.js";
import type { ReportDetail, ReportListItem, ReportRepository } from "./report.repository.js";
import { ReportService } from "./report.service.js";

function report(status: ReportStatus = "DRAFT", version = 1): ReportDetail {
  return {
    id: "report-1",
    uptId: "upt-a",
    periodId: "period-1",
    reportType: "BULANAN",
    status,
    version,
    createdAt: new Date(),
    updatedAt: new Date(),
    submittedAt: null,
    reviewedAt: null,
    approvedAt: null,
    reviewedBy: null,
    approvedBy: null,
    upt: { id: "upt-a", code: "UPT-A", name: "UPT A" },
    period: {
      id: "period-1",
      name: "Januari 2026",
      startDate: new Date(),
      dueDate: new Date(),
      status: "ACTIVE",
    },
    createdBy: { id: "user-1", name: "Petugas" },
    _count: { items: 1 },
    items: [
      {
        id: "item-1",
        indicatorId: "indicator-1",
        value: null,
        narrative: null,
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
    histories: [],
  };
}

function repository(overrides: Partial<ReportRepository> = {}): ReportRepository {
  return {
    list: async () => ({ items: [] as ReportListItem[], total: 0 }),
    findById: async () => report(),
    history: async () => ({ items: [], total: 0 }),
    findCreationContext: async () => ({
      period: { id: "period-1", status: "ACTIVE", indicators: [{ id: "indicator-1" }] },
      upt: { id: "upt-a" },
    }),
    exists: async () => false,
    createDraft: async () => report(),
    updateDraft: async () => report("DRAFT", 2),
    submit: async ({ validate }) => {
      const draft = report();
      await validate(draft);
      return { ...draft, status: "SUBMITTED", submittedAt: new Date() };
    },
    addReviewComment: async () => report("SUBMITTED"),
    requestRevision: async () => report("REVISION_REQUIRED"),
    markReviewed: async () => report("REVIEWED"),
    approve: async () => report("APPROVED"),
    ...overrides,
  };
}

test("report creates a DRAFT with approved period indicators", async () => {
  let creationInput: Parameters<ReportRepository["createDraft"]>[0] | undefined;
  const service = new ReportService(
    repository({
      createDraft: async (input) => {
        creationInput = input;
        return report();
      },
    }),
  );

  const created = await service.create({
    periodId: "period-1",
    reportType: "BULANAN",
    uptId: "upt-a",
    actorId: "user-1",
  });

  assert.equal(created.status, "DRAFT");
  assert.deepEqual(creationInput, {
    periodId: "period-1",
    reportType: "BULANAN",
    uptId: "upt-a",
    actorId: "user-1",
    indicatorIds: ["indicator-1"],
  });
});

test("report rejects duplicate UPT, period, and type", async () => {
  const service = new ReportService(repository({ exists: async () => true }));
  await assert.rejects(
    () =>
      service.create({
        periodId: "period-1",
        reportType: "BULANAN",
        uptId: "upt-a",
        actorId: "user-1",
      }),
    (error: unknown) => error instanceof AppError && error.code === "CONFLICT",
  );
});

test("report rejects an inactive period", async () => {
  const service = new ReportService(
    repository({
      findCreationContext: async () => ({
        period: { id: "period-1", status: "DRAFT", indicators: [] },
        upt: { id: "upt-a" },
      }),
    }),
  );
  await assert.rejects(
    () =>
      service.create({
        periodId: "period-1",
        reportType: "BULANAN",
        uptId: "upt-a",
        actorId: "user-1",
      }),
    (error: unknown) => error instanceof AppError && error.code === "PERIOD_INVALID_STATUS",
  );
});

test("report detail forwards UPT scope to repository", async () => {
  let receivedScope: string | undefined;
  const service = new ReportService(
    repository({
      findById: async (_id, scope) => {
        receivedScope = scope;
        return null;
      },
    }),
  );
  await assert.rejects(
    () => service.detail("report-b", "upt-a"),
    (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND",
  );
  assert.equal(receivedScope, "upt-a");
});

test("report history forwards pagination and UPT scope", async () => {
  let received: Parameters<ReportRepository["history"]>[2] | undefined;
  let receivedScope: string | undefined;
  const service = new ReportService(
    repository({
      history: async (_id, scope, pagination) => {
        receivedScope = scope;
        received = pagination;
        return { items: [], total: 0 };
      },
    }),
  );

  await service.history("report-1", { page: 2, pageSize: 10, uptScopeId: "upt-a" });

  assert.equal(receivedScope, "upt-a");
  assert.deepEqual(received, { skip: 10, take: 10 });
});

test("report list forwards pagination, filters, and UPT scope", async () => {
  let received: Parameters<ReportRepository["list"]>[0] | undefined;
  const service = new ReportService(
    repository({
      list: async (input) => {
        received = input;
        return { items: [], total: 0 };
      },
    }),
  );

  await service.list({
    page: 2,
    pageSize: 10,
    periodId: "period-1",
    status: "DRAFT",
    uptScopeId: "upt-a",
  });

  assert.deepEqual(received, {
    skip: 10,
    take: 10,
    periodId: "period-1",
    uptId: undefined,
    status: "DRAFT",
    uptScopeId: "upt-a",
  });
});

test("report submits a complete DRAFT through the transactional repository", async () => {
  let received: Parameters<ReportRepository["submit"]>[0] | undefined;
  const completeness = { validate: async () => [] };
  const service = new ReportService(
    repository({
      submit: async (input) => {
        received = input;
        const draft = report();
        await input.validate(draft);
        return { ...draft, status: "SUBMITTED", submittedAt: new Date() };
      },
    }),
    completeness,
  );

  const submitted = await service.submit("report-1", "upt-a", "coordinator-1");

  assert.equal(submitted.status, "SUBMITTED");
  assert.equal(received?.uptScopeId, "upt-a");
  assert.equal(received?.actorId, "coordinator-1");
});

test("report rejects an incomplete submission", async () => {
  const service = new ReportService(repository(), {
    validate: async () => [{ field: "items.0.value", message: "Nilai wajib diisi." }],
  });

  await assert.rejects(
    () => service.submit("report-1", "upt-a", "coordinator-1"),
    (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
  );
});

test("report rejects submission from an invalid source status", async () => {
  const service = new ReportService(repository({ submit: async () => "INVALID_STATUS" }), {
    validate: async () => [],
  });

  await assert.rejects(
    () => service.submit("report-1", "upt-a", "coordinator-1"),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
  );
});

test("report saves a Kanwil review comment only on SUBMITTED", async () => {
  let received: Parameters<ReportRepository["addReviewComment"]>[0] | undefined;
  const service = new ReportService(
    repository({
      addReviewComment: async (input) => {
        received = input;
        return report("SUBMITTED");
      },
    }),
  );

  const updated = await service.addReviewComment("report-1", "kanwil-1", "Lengkapi narasi.");

  assert.equal(updated.status, "SUBMITTED");
  assert.deepEqual(received, {
    id: "report-1",
    actorId: "kanwil-1",
    message: "Lengkapi narasi.",
  });
});

test("report rejects a review comment outside SUBMITTED", async () => {
  const service = new ReportService(repository({ addReviewComment: async () => "INVALID_STATUS" }));

  await assert.rejects(
    () => service.addReviewComment("report-1", "kanwil-1", "Lengkapi narasi."),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
  );
});

test("report requests revision from SUBMITTED with a note", async () => {
  let received: Parameters<ReportRepository["requestRevision"]>[0] | undefined;
  const service = new ReportService(
    repository({
      requestRevision: async (input) => {
        received = input;
        return report("REVISION_REQUIRED");
      },
    }),
  );

  const revised = await service.requestRevision("report-1", "kanwil-1", "Lengkapi narasi.");

  assert.equal(revised.status, "REVISION_REQUIRED");
  assert.deepEqual(received, {
    id: "report-1",
    actorId: "kanwil-1",
    message: "Lengkapi narasi.",
  });
});

test("report marks SUBMITTED as REVIEWED with its reviewer", async () => {
  let received: Parameters<ReportRepository["markReviewed"]>[0] | undefined;
  const service = new ReportService(
    repository({
      markReviewed: async (input) => {
        received = input;
        return report("REVIEWED");
      },
    }),
  );

  const reviewed = await service.markReviewed("report-1", "kanwil-1");

  assert.equal(reviewed.status, "REVIEWED");
  assert.deepEqual(received, { id: "report-1", actorId: "kanwil-1" });
});

test("report approves REVIEWED with its approver", async () => {
  let received: Parameters<ReportRepository["approve"]>[0] | undefined;
  const service = new ReportService(
    repository({
      approve: async (input) => {
        received = input;
        return report("APPROVED");
      },
    }),
  );

  const approved = await service.approve("report-1", "owner-1");

  assert.equal(approved.status, "APPROVED");
  assert.deepEqual(received, { id: "report-1", actorId: "owner-1" });
});

test("report rejects approval outside REVIEWED", async () => {
  const service = new ReportService(repository({ approve: async () => "INVALID_STATUS" }));

  await assert.rejects(
    () => service.approve("report-1", "owner-1"),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
  );
});

test("report rejects review completion outside SUBMITTED", async () => {
  const service = new ReportService(repository({ markReviewed: async () => "INVALID_STATUS" }));

  await assert.rejects(
    () => service.markReviewed("report-1", "kanwil-1"),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
  );
});

test("report rejects all workflow mutations after approval", async () => {
  const service = new ReportService(
    repository({
      findById: async () => report("APPROVED"),
      submit: async () => "INVALID_STATUS",
      addReviewComment: async () => "INVALID_STATUS",
      requestRevision: async () => "INVALID_STATUS",
      markReviewed: async () => "INVALID_STATUS",
      approve: async () => "INVALID_STATUS",
    }),
    { validate: async () => [] },
  );

  await assert.rejects(
    () =>
      service.update("report-1", {
        version: 1,
        items: [{ indicatorId: "indicator-1", value: "10" }],
        uptScopeId: "upt-a",
        actorId: "user-1",
      }),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_LOCKED",
  );
  await assert.rejects(
    () => service.submit("report-1", "upt-a", "coordinator-1"),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
  );
  await assert.rejects(
    () => service.addReviewComment("report-1", "kanwil-1", "Catatan"),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
  );
  await assert.rejects(
    () => service.requestRevision("report-1", "kanwil-1", "Catatan"),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
  );
  await assert.rejects(
    () => service.markReviewed("report-1", "kanwil-1"),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
  );
  await assert.rejects(
    () => service.approve("report-1", "owner-1"),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_INVALID_STATUS",
  );
});

test("report rejects updates after submission", async () => {
  for (const status of ["SUBMITTED", "REVIEWED", "APPROVED"] as const) {
    const service = new ReportService(repository({ findById: async () => report(status) }));
    await assert.rejects(
      () =>
        service.update("report-1", {
          version: 1,
          items: [{ indicatorId: "indicator-1", value: "10" }],
          uptScopeId: "upt-a",
          actorId: "user-1",
        }),
      (error: unknown) => error instanceof AppError && error.code === "REPORT_LOCKED",
    );
  }
});

test("report rejects stale draft version", async () => {
  const service = new ReportService(repository({ findById: async () => report("DRAFT", 2) }));
  await assert.rejects(
    () =>
      service.update("report-1", {
        version: 1,
        items: [{ indicatorId: "indicator-1", value: "10" }],
        uptScopeId: "upt-a",
        actorId: "user-1",
      }),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_VERSION_CONFLICT",
  );
});

test("report rejects an indicator from another period", async () => {
  const service = new ReportService(repository());
  await assert.rejects(
    () =>
      service.update("report-1", {
        version: 1,
        items: [{ indicatorId: "indicator-other", value: "10" }],
        uptScopeId: "upt-a",
        actorId: "user-1",
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "VALIDATION_ERROR" &&
      error.fields[0]?.field === "items.0.indicatorId",
  );
});
