import assert from "node:assert/strict";
import test from "node:test";
import type { ReadStream } from "node:fs";
import type { ReportStatus } from "@prisma/client";

import { AppError } from "../middleware/error.js";
import type { AttachmentRepository } from "../modules/attachments/attachment.repository.js";
import { AttachmentService } from "../modules/attachments/attachment.service.js";
import type { AuditRepository } from "../modules/shared/audit.repository.js";
import type { DashboardRepository } from "../modules/dashboard/dashboard.repository.js";
import { DashboardService } from "../modules/dashboard/dashboard.service.js";
import type { ReportRepository } from "../modules/reports/report.repository.js";
import { ReportService } from "../modules/reports/report.service.js";

const audit: AuditRepository = { write: async () => undefined };
const statuses: ReportStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "REVISION_REQUIRED",
  "REVIEWED",
  "APPROVED",
];

function reportRepositoryFor(visibleUpt: string): ReportRepository {
  return {
    list: async ({ uptScopeId }) => ({
      items: uptScopeId === visibleUpt ? ([] as never[]) : ([] as never[]),
      total: uptScopeId === visibleUpt ? 1 : 0,
    }),
    findById: async (_id, uptScopeId) => (uptScopeId === visibleUpt ? ({} as never) : null),
    history: async () => ({ items: [], total: 0 }),
    findCreationContext: async (_periodId, uptId) => ({
      period: { id: "period-1", status: "ACTIVE", indicators: [{ id: "indicator-1" }] },
      upt: uptId === visibleUpt ? { id: visibleUpt } : null,
    }),
    exists: async () => false,
    createDraft: async () => ({}) as never,
    updateDraft: async () => null,
    submit: async ({ uptScopeId }) => (uptScopeId === visibleUpt ? ({} as never) : "NOT_FOUND"),
    addReviewComment: async () => "NOT_FOUND",
    requestRevision: async () => "NOT_FOUND",
    markReviewed: async () => "NOT_FOUND",
    approve: async () => "NOT_FOUND",
  };
}

test("UPT A cannot read, update, submit, or create against UPT B", async () => {
  const service = new ReportService(reportRepositoryFor("upt-a"), { validate: async () => [] });
  const list = await service.list({ page: 1, pageSize: 25, uptScopeId: "upt-a", uptId: "upt-b" });
  assert.equal(list.total, 1);

  await assert.rejects(
    () => service.detail("report-b", "upt-b"),
    (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND",
  );
  await assert.rejects(
    () =>
      service.update("report-b", { version: 1, items: [], uptScopeId: "upt-b", actorId: "user-a" }),
    (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND",
  );
  await assert.rejects(
    () => service.submit("report-b", "upt-b", "coordinator-a"),
    (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND",
  );
  await assert.rejects(
    () =>
      service.create({
        periodId: "period-1",
        reportType: "BULANAN",
        uptId: "upt-b",
        actorId: "user-a",
      }),
    (error: unknown) => error instanceof AppError && error.code === "UPT_SCOPE_FORBIDDEN",
  );
});

function attachmentRepositoryFor(visibleUpt: string): AttachmentRepository {
  return {
    findReportForUpload: async (_id, uptScopeId) =>
      uptScopeId === visibleUpt
        ? { id: "report-a", periodId: "period-1", status: "DRAFT", items: [] }
        : null,
    findRequirement: async () => null,
    create: async () => ({}) as never,
    findById: async (_id, uptScopeId) => (uptScopeId === visibleUpt ? ({} as never) : null),
    delete: async () => false,
  };
}

test("UPT A cannot upload, download, or delete UPT B attachments", async () => {
  const service = new AttachmentService(
    attachmentRepositoryFor("upt-a"),
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => undefined,
    },
    1_024,
  );
  const file = {
    filepath: "/unused",
    originalFilename: "bukti.pdf",
    mimetype: "application/pdf",
    size: 10,
  };

  await assert.rejects(
    () => service.upload({ reportId: "report-b", uptScopeId: "upt-b", actorId: "user-a", file }),
    (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND",
  );
  await assert.rejects(
    () => service.download("attachment-b", "upt-b"),
    (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND",
  );
  await assert.rejects(
    () => service.delete("attachment-b", "upt-b", "user-a"),
    (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND",
  );
});

test("UPT-scoped dashboard and export queries retain the assigned UPT", async () => {
  const captured: Array<{ uptId: string | undefined; operation: string }> = [];
  const period = {
    id: "period-1",
    name: "Periode",
    startDate: new Date("2026-01-01"),
    dueDate: new Date("2026-01-31"),
  };
  const repository: DashboardRepository = {
    findPeriod: async () => period,
    summarize: async (filters) => {
      captured.push({ uptId: filters.uptId, operation: "summary" });
      return { DRAFT: 0, SUBMITTED: 0, REVISION_REQUIRED: 0, REVIEWED: 0, APPROVED: 0 };
    },
    listByUpt: async (filters) => {
      captured.push({ uptId: filters.uptId, operation: "by-upt" });
      return { items: [], total: 0 };
    },
    listReports: async (filters) => {
      captured.push({ uptId: filters.uptId, operation: "export" });
      return [];
    },
  };
  const service = new DashboardService(repository, audit);

  await service.summary({ periodId: period.id, uptId: "upt-b", uptScopeId: "upt-a" });
  await service.byUpt({ periodId: period.id, uptId: "upt-b", uptScopeId: "upt-a" });
  await service.exportReports({
    periodId: period.id,
    uptId: "upt-b",
    uptScopeId: "upt-a",
    actorId: "user-a",
  });

  assert.deepEqual(captured, [
    { uptId: "upt-a", operation: "summary" },
    { uptId: "upt-a", operation: "by-upt" },
    { uptId: "upt-a", operation: "export" },
  ]);
});

void statuses;
