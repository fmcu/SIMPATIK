import assert from "node:assert/strict";
import test from "node:test";
import type { ReportingPeriod } from "@prisma/client";

import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { PeriodRepository } from "./period.repository.js";
import { PeriodService } from "./period.service.js";

function period(status: "DRAFT" | "ACTIVE" | "CLOSED"): ReportingPeriod {
  return {
    id: "period-1",
    name: "Periode",
    startDate: new Date("2026-01-01"),
    dueDate: new Date("2026-01-31"),
    status,
    configurationVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function repository(overrides: Partial<PeriodRepository> = {}): PeriodRepository {
  return {
    list: async () => ({ items: [], total: 0 }),
    findById: async () => ({ ...period("DRAFT"), indicators: [], requiredDocuments: [] }),
    create: async (data) => ({ ...period(data.status), ...data }),
    update: async (_id, data) => ({
      ...period(data.status ?? "DRAFT"),
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.startDate === undefined ? {} : { startDate: data.startDate }),
      ...(data.dueDate === undefined ? {} : { dueDate: data.dueDate }),
    }),
    countActive: async () => 0,
    ...overrides,
  };
}

const audit: AuditRepository = { write: async () => undefined };

test("period rejects due date before start date", async () => {
  const service = new PeriodService(repository(), audit);
  await assert.rejects(
    () =>
      service.create(
        {
          name: "Periode",
          startDate: new Date("2026-02-01"),
          dueDate: new Date("2026-01-01"),
          status: "DRAFT",
        },
        "admin",
      ),
    (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
  );
});

test("period rejects invalid status transition", async () => {
  const service = new PeriodService(
    repository({
      findById: async () => ({ ...period("CLOSED"), indicators: [], requiredDocuments: [] }),
    }),
    audit,
  );
  await assert.rejects(
    () => service.update("period-1", { status: "ACTIVE" }, "admin"),
    (error: unknown) => error instanceof AppError && error.code === "PERIOD_INVALID_STATUS",
  );
});

test("period rejects second active period", async () => {
  const service = new PeriodService(repository({ countActive: async () => 1 }), audit);
  await assert.rejects(
    () =>
      service.create(
        {
          name: "Periode",
          startDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-31"),
          status: "ACTIVE",
        },
        "admin",
      ),
    (error: unknown) => error instanceof AppError && error.code === "PERIOD_ALREADY_ACTIVE",
  );
});
