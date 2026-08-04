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
    findCreationContext: async () => ({
      period: { id: "period-1", status: "ACTIVE", indicators: [{ id: "indicator-1" }] },
      upt: { id: "upt-a" },
    }),
    exists: async () => false,
    createDraft: async () => report(),
    updateDraft: async () => report("DRAFT", 2),
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

test("report rejects updates after submission", async () => {
  const service = new ReportService(repository({ findById: async () => report("SUBMITTED") }));
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
