import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import type { ReadStream } from "node:fs";

import { AppError } from "../../middleware/error.js";
import { StorageUnavailableError } from "../../services/private-storage.service.js";
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
    enqueueUploadCleanup: async (storageKey) => ({ id: "upload-cleanup-1", storageKey }),
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
    resolveUploadCleanup: async () => ({
      status: "CLEANUP_REQUIRED",
      attempts: 1,
      leaseUntil: new Date("2026-08-16T01:00:00.000Z"),
    }),
    completeUploadCleanup: async () => true,
    findById: async () => null,
    delete: async () => ({ status: "DELETED", cleanupTaskId: "cleanup-1" }),
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

test("attachment upload durably enqueues cleanup before writing and passes its task to metadata creation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-attachment-"));
  const source = join(directory, "upload.pdf");
  const events: string[] = [];
  let enqueuedKey = "";
  let enqueuedAt: Date | undefined;
  let createInput: Parameters<AttachmentRepository["create"]>[0] | undefined;
  await writeFile(source, "%PDF-test");
  const service = new AttachmentService(
    {
      ...repository(),
      enqueueUploadCleanup: async (storageKey, nextAttemptAt) => {
        events.push("enqueue");
        enqueuedKey = storageKey;
        enqueuedAt = nextAttemptAt;
        return { id: "upload-cleanup-1", storageKey };
      },
      create: async (input) => {
        events.push("create");
        createInput = input;
        return repository().create(input);
      },
    },
    {
      write: async () => {
        events.push("write");
      },
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => undefined,
    },
    1_024,
  );

  try {
    const beforeUpload = Date.now();
    await service.upload({
      reportId: "report-1",
      uptScopeId: "upt-1",
      actorId: "user-1",
      file: {
        filepath: source,
        originalFilename: "bukti.pdf",
        mimetype: "application/pdf",
        size: 9,
      },
    });

    assert.deepEqual(events, ["enqueue", "write", "create"]);
    assert.equal(createInput?.storageKey, enqueuedKey);
    assert.equal(createInput?.cleanupTaskId, "upload-cleanup-1");
    assert.ok((enqueuedAt?.getTime() ?? 0) >= beforeUpload + 60 * 60 * 1_000);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("attachment upload does not write when durable cleanup enqueue fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-attachment-"));
  const source = join(directory, "upload.pdf");
  let wrote = false;
  await writeFile(source, "%PDF-test");
  const service = new AttachmentService(
    {
      ...repository(),
      enqueueUploadCleanup: async () => {
        throw new Error("database unavailable");
      },
    },
    {
      write: async () => {
        wrote = true;
      },
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => undefined,
    },
    1_024,
  );

  try {
    await assert.rejects(
      () =>
        service.upload({
          reportId: "report-1",
          uptScopeId: "upt-1",
          actorId: "user-1",
          file: {
            filepath: source,
            originalFilename: "bukti.pdf",
            mimetype: "application/pdf",
            size: 9,
          },
        }),
      (error: unknown) => error instanceof AppError && error.code === "INTERNAL_ERROR",
    );
    assert.equal(wrote, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("attachment upload retains repeat tombstone after ambiguous write rejection despite successful delete", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-attachment-"));
  const source = join(directory, "upload.pdf");
  const events: string[] = [];
  await writeFile(source, "%PDF-test");
  const service = new AttachmentService(
    {
      ...repository(),
      resolveUploadCleanup: async () => {
        events.push("resolve");
        return {
          status: "CLEANUP_REQUIRED",
          attempts: 1,
          leaseUntil: new Date("2026-08-16T01:00:00.000Z"),
        };
      },
      completeUploadCleanup: async () => {
        events.push("complete");
        return true;
      },
    },
    {
      write: async () => {
        events.push("write");
        throw new StorageUnavailableError();
      },
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => {
        events.push("delete");
      },
    },
    1_024,
  );

  try {
    await assert.rejects(
      () =>
        service.upload({
          reportId: "report-1",
          uptScopeId: "upt-1",
          actorId: "user-1",
          file: {
            filepath: source,
            originalFilename: "bukti.pdf",
            mimetype: "application/pdf",
            size: 9,
          },
        }),
      (error: unknown) => error instanceof AppError && error.code === "STORAGE_UNAVAILABLE",
    );
    assert.deepEqual(events, ["write", "resolve", "delete"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("attachment upload leaves durable cleanup task when metadata creation and object cleanup fail", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-attachment-"));
  const source = join(directory, "upload.pdf");
  let completed = false;
  let resolved = false;
  await writeFile(source, "%PDF-test");
  const service = new AttachmentService(
    {
      ...repository(),
      create: async () => {
        throw new Error("metadata failed");
      },
      resolveUploadCleanup: async () => {
        resolved = true;
        return {
          status: "CLEANUP_REQUIRED",
          attempts: 1,
          leaseUntil: new Date("2026-08-16T01:00:00.000Z"),
        };
      },
      completeUploadCleanup: async () => {
        completed = true;
        return true;
      },
    },
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => {
        throw new Error("storage unavailable");
      },
    },
    1_024,
  );

  try {
    await assert.rejects(
      () =>
        service.upload({
          reportId: "report-1",
          uptScopeId: "upt-1",
          actorId: "user-1",
          file: {
            filepath: source,
            originalFilename: "bukti.pdf",
            mimetype: "application/pdf",
            size: 9,
          },
        }),
      (error: unknown) => error instanceof AppError && error.code === "INTERNAL_ERROR",
    );
    assert.equal(resolved, true);
    assert.equal(completed, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("attachment upload never deletes object when metadata commit won despite ambiguous create failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-attachment-"));
  const source = join(directory, "upload.pdf");
  let storageDeleted = false;
  let taskCompleted = false;
  await writeFile(source, "%PDF-test");
  const service = new AttachmentService(
    {
      ...repository(),
      create: async () => {
        throw new Error("transaction response lost");
      },
      resolveUploadCleanup: async () => ({ status: "METADATA_COMMITTED" }),
      completeUploadCleanup: async () => {
        taskCompleted = true;
        return true;
      },
    },
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => {
        storageDeleted = true;
      },
    },
    1_024,
  );

  try {
    await assert.rejects(
      () =>
        service.upload({
          reportId: "report-1",
          uptScopeId: "upt-1",
          actorId: "user-1",
          file: {
            filepath: source,
            originalFilename: "bukti.pdf",
            mimetype: "application/pdf",
            size: 9,
          },
        }),
      (error: unknown) => error instanceof AppError && error.code === "INTERNAL_ERROR",
    );
    assert.equal(storageDeleted, false);
    assert.equal(taskCompleted, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("attachment upload never deletes object when cleanup claim outcome is deferred", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-attachment-"));
  const source = join(directory, "upload.pdf");
  let storageDeleted = false;
  let taskCompleted = false;
  await writeFile(source, "%PDF-test");
  const service = new AttachmentService(
    {
      ...repository(),
      create: async () => {
        throw new Error("transaction still resolving");
      },
      resolveUploadCleanup: async () => ({ status: "DEFERRED" }),
      completeUploadCleanup: async () => {
        taskCompleted = true;
        return true;
      },
    },
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => {
        storageDeleted = true;
      },
    },
    1_024,
  );

  try {
    await assert.rejects(
      () =>
        service.upload({
          reportId: "report-1",
          uptScopeId: "upt-1",
          actorId: "user-1",
          file: {
            filepath: source,
            originalFilename: "bukti.pdf",
            mimetype: "application/pdf",
            size: 9,
          },
        }),
      (error: unknown) => error instanceof AppError && error.code === "INTERNAL_ERROR",
    );
    assert.equal(storageDeleted, false);
    assert.equal(taskCompleted, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("attachment upload completes tombstone after successful write and metadata failure cleanup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-attachment-"));
  const source = join(directory, "upload.pdf");
  const events: string[] = [];
  await writeFile(source, "%PDF-test");
  const service = new AttachmentService(
    {
      ...repository(),
      create: async () => {
        throw new Error("metadata failed");
      },
      resolveUploadCleanup: async () => {
        events.push("resolve");
        return {
          status: "CLEANUP_REQUIRED",
          attempts: 1,
          leaseUntil: new Date("2026-08-16T01:00:00.000Z"),
        };
      },
      completeUploadCleanup: async () => {
        events.push("complete");
        return true;
      },
    },
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => {
        events.push("delete");
      },
    },
    1_024,
  );

  try {
    await assert.rejects(() =>
      service.upload({
        reportId: "report-1",
        uptScopeId: "upt-1",
        actorId: "user-1",
        file: {
          filepath: source,
          originalFilename: "bukti.pdf",
          mimetype: "application/pdf",
          size: 9,
        },
      }),
    );
    assert.deepEqual(events, ["resolve", "delete", "complete"]);
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

test("attachment delete leaves object cleanup exclusively to the durable worker", async () => {
  let repositoryDeleted = false;
  let storageDeleted = false;
  const service = new AttachmentService(
    {
      ...repository(),
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
        report: { id: "report-1", status: "DRAFT" },
      }),
      delete: async () => {
        repositoryDeleted = true;
        return { status: "DELETED", cleanupTaskId: "cleanup-1" };
      },
    },
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => {
        storageDeleted = true;
      },
    },
    1_024,
  );

  await service.delete("attachment-1", "upt-1", "user-1");

  assert.equal(repositoryDeleted, true);
  assert.equal(storageDeleted, false);
});

test("attachment delete does not swallow a transactional enqueue failure", async () => {
  let storageDeleted = false;
  const service = new AttachmentService(
    {
      ...repository(),
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
        report: { id: "report-1", status: "DRAFT" },
      }),
      delete: async () => {
        throw new Error("enqueue failed");
      },
    },
    {
      write: async () => undefined,
      read: async () => process.stdin as unknown as ReadStream,
      delete: async () => {
        storageDeleted = true;
      },
    },
    1_024,
  );

  await assert.rejects(() => service.delete("attachment-1", "upt-1", "user-1"), /enqueue failed/);
  assert.equal(storageDeleted, false);
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
