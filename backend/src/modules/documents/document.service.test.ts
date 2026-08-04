import assert from "node:assert/strict";
import test from "node:test";
import type { RequiredDocument } from "@prisma/client";

import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { DocumentRepository } from "./document.repository.js";
import { DocumentService } from "./document.service.js";

const document: RequiredDocument = {
  id: "document-1",
  periodId: "period-1",
  indicatorId: null,
  code: "DOC-1",
  name: "Dokumen satu",
  required: true,
  allowedMimeTypes: ["application/pdf"],
  maxSize: 1000,
  order: 1,
  approvalStatus: "PENDING",
  approvedById: null,
  approvedAt: null,
  rejectionReason: null,
};

function repository(overrides: Partial<DocumentRepository> = {}): DocumentRepository {
  return {
    list: async () => [],
    findById: async () => ({ ...document, period: { status: "DRAFT" }, indicator: null }),
    period: async () => ({ id: "period-1", status: "DRAFT" }),
    indicator: async () => null,
    create: async () => document,
    update: async () => document,
    approve: async () => ({ ...document, approvalStatus: "APPROVED" }),
    requiredForReport: async () => [{ id: "document-1", code: "DOC-1", name: "Dokumen satu" }],
    attachmentRequirementIds: async () => [],
    ...overrides,
  };
}

const audit: AuditRepository = { write: async () => undefined };

test("report document validation returns requirements without matching attachments", async () => {
  const service = new DocumentService(repository(), audit);

  assert.deepEqual(await service.missingForReport("period-1", "report-1"), [
    { id: "document-1", code: "DOC-1", name: "Dokumen satu" },
  ]);
});

test("document creation rejects an indicator from another period", async () => {
  const service = new DocumentService(
    repository({ indicator: async () => ({ id: "indicator-1", period: { id: "other-period", status: "DRAFT" } }) }),
    audit,
  );

  await assert.rejects(
    () => service.create({ indicatorId: "indicator-1", code: "DOC-1", name: "Dokumen", required: true, allowedMimeTypes: ["application/pdf"], maxSize: 1000, order: 1 }, "admin", "period-1"),
    (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
  );
});
