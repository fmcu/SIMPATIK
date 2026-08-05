import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import type { ReadStream } from "node:fs";

import { AppError } from "../../middleware/error.js";
import type { AttachmentRepository } from "./attachment.repository.js";
import { AttachmentService } from "./attachment.service.js";

type StorageCall = { storageKey: string; sourcePath: string };

function repository(
  status: "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "REVIEWED" | "APPROVED" = "DRAFT",
): AttachmentRepository {
  return {
    findReportForUpload: async () => ({
      id: "report-1",
      periodId: "period-1",
      status,
      items: [{ id: "item-1", indicatorId: "indicator-1" }],
    }),
    findRequirement: async () => null,
    create: async () => ({
      id: "attachment-1",
      reportItemId: null,
      requirementId: null,
      originalName: "bukti.pdf",
      mimeType: "application/pdf",
      size: 9,
      createdAt: new Date(),
      uploadedBy: { id: "user-1", name: "Petugas" },
      requirement: null,
    }),
    findById: async () => null,
    delete: async () => true,
  };
}

test("attachment upload rejects a file MIME type outside the allowlist", async () => {
  const service = new AttachmentService(
    repository(),
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => undefined,
    },
    1_024,
  );

  await assert.rejects(
    () =>
      service.upload({
        reportId: "report-1",
        uptScopeId: "upt-1",
        actorId: "user-1",
        file: {
          filepath: "/unused",
          originalFilename: "bukti.exe",
          mimetype: "application/x-msdownload",
          size: 10,
        },
      }),
    (error: unknown) => error instanceof AppError && error.code === "ATTACHMENT_INVALID",
  );
});

test("attachment upload rejects a file larger than the configured limit", async () => {
  const service = new AttachmentService(
    repository(),
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => undefined,
    },
    10,
  );

  await assert.rejects(
    () =>
      service.upload({
        reportId: "report-1",
        uptScopeId: "upt-1",
        actorId: "user-1",
        file: {
          filepath: "/unused",
          originalFilename: "bukti.pdf",
          mimetype: "application/pdf",
          size: 11,
        },
      }),
    (error: unknown) => error instanceof AppError && error.code === "ATTACHMENT_TOO_LARGE",
  );
});

test("attachment upload validates file signature then writes a random storage key", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-attachment-"));
  const source = join(directory, "upload.pdf");
  const writes: StorageCall[] = [];
  await writeFile(source, "%PDF-test");
  const service = new AttachmentService(
    repository(),
    {
      write: async (storageKey, sourcePath) => {
        writes.push({ storageKey, sourcePath });
      },
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => undefined,
    },
    1_024,
  );

  try {
    await service.upload({
      reportId: "report-1",
      uptScopeId: "upt-1",
      actorId: "user-1",
      file: {
        filepath: source,
        originalFilename: "../../bukti.pdf",
        mimetype: "application/pdf",
        size: 9,
      },
    });
    assert.match(writes[0]?.storageKey ?? "", /^attachments\/[a-f0-9-]{36}$/);
    assert.equal(writes[0]?.sourcePath, source);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("attachment download cannot resolve an attachment outside the UPT scope", async () => {
  let receivedScope: string | undefined;
  const service = new AttachmentService(
    {
      ...repository(),
      findById: async (_id, scope) => {
        receivedScope = scope;
        return null;
      },
    },
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => undefined,
    },
    1_024,
  );

  await assert.rejects(
    () => service.download("attachment-b", "upt-a"),
    (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND",
  );
  assert.equal(receivedScope, "upt-a");
});

test("attachment deletion is locked for an APPROVED report", async () => {
  const service = new AttachmentService(
    {
      ...repository("APPROVED"),
      findById: async () => ({
        id: "attachment-1",
        reportItemId: null,
        requirementId: null,
        originalName: "bukti.pdf",
        mimeType: "application/pdf",
        size: 9,
        createdAt: new Date(),
        uploadedBy: { id: "user-1", name: "Petugas" },
        requirement: null,
        storageKey: "attachments/key",
        report: { id: "report-1", status: "APPROVED" },
      }),
    },
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => undefined,
    },
    1_024,
  );

  await assert.rejects(
    () => service.delete("attachment-1", "upt-1", "user-1"),
    (error: unknown) => error instanceof AppError && error.code === "REPORT_LOCKED",
  );
});

test("attachment upload is locked once a report is submitted", async () => {
  for (const status of ["SUBMITTED", "REVIEWED", "APPROVED"] as const) {
    const service = new AttachmentService(
      repository(status),
      {
        write: async () => undefined,
        read: async () => process.stdin as unknown as ReadStream,
        delete: async () => undefined,
      },
      1_024,
    );

    await assert.rejects(
      () =>
        service.upload({
          reportId: "report-1",
          uptScopeId: "upt-1",
          actorId: "user-1",
          file: {
            filepath: "/unused",
            originalFilename: "bukti.pdf",
            mimetype: "application/pdf",
            size: 10,
          },
        }),
      (error: unknown) => error instanceof AppError && error.code === "REPORT_LOCKED",
    );
  }
});
