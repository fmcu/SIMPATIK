import assert from "node:assert/strict";
import test from "node:test";
import type { Indicator } from "@prisma/client";

import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { IndicatorRepository } from "./indicator.repository.js";
import { IndicatorService } from "./indicator.service.js";

function indicator(status: "DRAFT" | "ACTIVE", approvalStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING") {
  return {
    id: "indicator-1",
    periodId: "period-1",
    code: "IND-1",
    name: "Indikator satu",
    required: true,
    order: 1,
    inputConfig: {},
    approvalStatus,
    approvedById: null,
    approvedAt: null,
    rejectionReason: null,
    period: { status },
  } as Indicator & { period: { status: "DRAFT" | "ACTIVE" } };
}

function repository(overrides: Partial<IndicatorRepository> = {}): IndicatorRepository {
  return {
    list: async () => [],
    findById: async () => indicator("DRAFT"),
    period: async () => ({ id: "period-1", status: "DRAFT" }),
    create: async () => indicator("DRAFT"),
    update: async () => indicator("DRAFT"),
    approve: async (_id, status, actorId, reason) => ({
      ...indicator("DRAFT", status),
      approvedById: actorId,
      rejectionReason: reason ?? null,
    }),
    ...overrides,
  };
}

const auditEvents: Array<{ action: string; entityId?: string }> = [];
const audit: AuditRepository = {
  write: async ({ action, entityId }) => {
    auditEvents.push(entityId === undefined ? { action } : { action, entityId });
  },
};

test("indicator approval is limited to draft periods", async () => {
  const service = new IndicatorService(
    repository({ findById: async () => indicator("ACTIVE") }),
    audit,
  );

  await assert.rejects(
    () => service.approve("indicator-1", "APPROVED", "product-owner"),
    (error: unknown) => error instanceof AppError && error.code === "CONFIGURATION_LOCKED",
  );
});

test("indicator approval records the approval audit event", async () => {
  auditEvents.length = 0;
  const service = new IndicatorService(repository(), audit);

  const result = await service.approve("indicator-1", "APPROVED", "product-owner");

  assert.equal(result.approvedById, "product-owner");
  assert.deepEqual(auditEvents, [{ action: "INDICATOR_APPROVED", entityId: "indicator-1" }]);
});

test("approved indicators cannot be edited", async () => {
  const service = new IndicatorService(
    repository({ findById: async () => indicator("DRAFT", "APPROVED") }),
    audit,
  );

  await assert.rejects(
    () => service.update("indicator-1", { name: "Perubahan" }, "admin"),
    (error: unknown) => error instanceof AppError && error.code === "CONFIGURATION_LOCKED",
  );
});
