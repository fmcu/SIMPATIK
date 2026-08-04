import assert from "node:assert/strict";
import test from "node:test";

import {
  failure,
  paginationSchema,
  reportStatusSchema,
  requiredDocumentCreateSchema,
  roleSchema,
  success,
} from "./index.js";

test("shared role and report status schemas expose canonical values", () => {
  assert.equal(roleSchema.parse("SYSTEM_ADMIN"), "SYSTEM_ADMIN");
  assert.equal(reportStatusSchema.parse("REVISION_REQUIRED"), "REVISION_REQUIRED");
  assert.throws(() => roleSchema.parse("UNKNOWN"));
});

test("API helpers preserve response envelope", () => {
  assert.deepEqual(success({ ready: true }, { requestId: "req-1" }), {
    data: { ready: true },
    meta: { requestId: "req-1" },
  });
  assert.deepEqual(failure("NOT_FOUND", "Tidak ditemukan."), {
    error: { code: "NOT_FOUND", message: "Tidak ditemukan.", fields: [] },
  });
});

test("pagination schema rejects unsafe page sizes", () => {
  assert.equal(
    paginationSchema.parse({ page: 1, pageSize: 25, total: 0, totalPages: 0 }).pageSize,
    25,
  );
  assert.throws(() => paginationSchema.parse({ page: 1, pageSize: 101, total: 0, totalPages: 0 }));
});

test("required document configuration requires an allowlisted file type", () => {
  assert.throws(() =>
    requiredDocumentCreateSchema.parse({
      periodId: "period-1",
      code: "DOC-1",
      name: "Dokumen",
      maxSize: 1000,
      order: 1,
    }),
  );

  assert.equal(
    requiredDocumentCreateSchema.parse({
      periodId: "period-1",
      code: "DOC-1",
      name: "Dokumen",
      allowedMimeTypes: ["application/pdf"],
      maxSize: 1000,
      order: 1,
    }).allowedMimeTypes[0],
    "application/pdf",
  );
});
