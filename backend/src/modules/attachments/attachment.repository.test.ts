import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import { createAttachmentRepository } from "./attachment.repository.js";

const attachment = {
  id: "attachment-1",
  reportItemId: null,
  requirementId: null,
  originalName: "bukti.pdf",
  mimeType: "application/pdf",
  size: 9,
  createdAt: new Date(),
  uploadedBy: { id: "user-1", name: "Petugas" },
  requirement: null,
};

const createInput = {
  reportId: "report-1",
  storageKey: "attachments/00000000-0000-0000-0000-000000000001",
  cleanupTaskId: "cleanup-1",
  originalName: "bukti.pdf",
  mimeType: "application/pdf",
  size: 9,
  uploadedById: "user-1",
};

test("attachment create consumes only its unclaimed upload tombstone in the metadata transaction", async () => {
  let cleanupWhere: unknown;
  let attachmentCreated = false;
  let auditCreated = false;
  const transaction = {
    storageDeletionTask: {
      deleteMany: async (input: { where: unknown }) => {
        cleanupWhere = input.where;
        return { count: 1 };
      },
    },
    attachment: {
      create: async () => {
        attachmentCreated = true;
        return attachment;
      },
    },
    auditLog: {
      create: async () => {
        auditCreated = true;
      },
    },
  };
  const database = {
    $transaction: async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as unknown as PrismaClient;

  const result = await createAttachmentRepository(database).create(createInput);

  assert.equal(result, attachment);
  assert.deepEqual(cleanupWhere, {
    id: "cleanup-1",
    storageKey: createInput.storageKey,
    attempts: 0,
    repeatUntilCancelled: true,
  });
  assert.equal(attachmentCreated, true);
  assert.equal(auditCreated, true);
});

test("attachment create aborts before metadata when worker already claimed upload tombstone", async () => {
  let attachmentCreated = false;
  const transaction = {
    storageDeletionTask: { deleteMany: async () => ({ count: 0 }) },
    attachment: {
      create: async () => {
        attachmentCreated = true;
        return attachment;
      },
    },
  };
  const database = {
    $transaction: async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as unknown as PrismaClient;

  await assert.rejects(
    () => createAttachmentRepository(database).create(createInput),
    /Upload cleanup task was already claimed/,
  );
  assert.equal(attachmentCreated, false);
});

test("upload cleanup resolution claims tombstone before checking metadata", async () => {
  const leaseUntil = new Date("2026-08-16T01:05:00.000Z");
  const events: string[] = [];
  let claimWhere: unknown;
  let claimData: unknown;
  const transaction = {
    storageDeletionTask: {
      updateMany: async ({ where, data }: { where: unknown; data: unknown }) => {
        events.push("claim");
        claimWhere = where;
        claimData = data;
        return { count: 1 };
      },
    },
    attachment: {
      findUnique: async () => {
        events.push("attachment");
        return null;
      },
    },
  };
  const database = {
    $transaction: async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as unknown as PrismaClient;
  const repository = createAttachmentRepository(database);

  const result = await repository.resolveUploadCleanup(
    { id: "cleanup-1", storageKey: createInput.storageKey },
    leaseUntil,
  );

  assert.deepEqual(result, { status: "CLEANUP_REQUIRED", attempts: 1, leaseUntil });
  assert.deepEqual(events, ["claim"]);
  assert.deepEqual(claimWhere, {
    id: "cleanup-1",
    storageKey: createInput.storageKey,
    attempts: 0,
    repeatUntilCancelled: true,
  });
  assert.deepEqual(claimData, {
    attempts: { increment: 1 },
    nextAttemptAt: leaseUntil,
  });
});

test("upload cleanup resolution checks metadata only after losing tombstone claim", async () => {
  const events: string[] = [];
  const transaction = {
    storageDeletionTask: {
      updateMany: async () => {
        events.push("claim");
        return { count: 0 };
      },
    },
    attachment: {
      findUnique: async () => {
        events.push("attachment");
        return { id: "attachment-1" };
      },
    },
  };
  const database = {
    $transaction: async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as unknown as PrismaClient;
  const repository = createAttachmentRepository(database);

  const result = await repository.resolveUploadCleanup(
    { id: "cleanup-1", storageKey: createInput.storageKey },
    new Date(),
  );

  assert.deepEqual(result, { status: "METADATA_COMMITTED" });
  assert.deepEqual(events, ["claim", "attachment"]);
});

test("upload cleanup resolution defers when claim is lost without committed metadata", async () => {
  const transaction = {
    storageDeletionTask: { updateMany: async () => ({ count: 0 }) },
    attachment: { findUnique: async () => null },
  };
  const database = {
    $transaction: async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as unknown as PrismaClient;
  const repository = createAttachmentRepository(database);

  const result = await repository.resolveUploadCleanup(
    { id: "cleanup-1", storageKey: createInput.storageKey },
    new Date(),
  );

  assert.deepEqual(result, { status: "DEFERRED" });
});

test("upload cleanup completion is fenced against concurrent worker claims", async () => {
  const nextAttemptAt = new Date("2026-08-16T01:00:00.000Z");
  let deletedWhere: unknown;
  const database = {
    storageDeletionTask: {
      deleteMany: async ({ where }: { where: unknown }) => {
        deletedWhere = where;
        return { count: 1 };
      },
    },
  } as unknown as PrismaClient;
  const repository = createAttachmentRepository(database);

  const completed = await repository.completeUploadCleanup(
    { id: "cleanup-1", storageKey: createInput.storageKey },
    2,
    nextAttemptAt,
  );

  assert.equal(completed, true);
  assert.deepEqual(deletedWhere, {
    id: "cleanup-1",
    storageKey: createInput.storageKey,
    attempts: 2,
    nextAttemptAt,
    repeatUntilCancelled: true,
  });
});

test("upload cleanup completion reports a lost worker race", async () => {
  const database = {
    storageDeletionTask: { deleteMany: async () => ({ count: 0 }) },
  } as unknown as PrismaClient;
  const repository = createAttachmentRepository(database);

  const completed = await repository.completeUploadCleanup(
    { id: "cleanup-1", storageKey: createInput.storageKey },
    0,
    new Date(),
  );

  assert.equal(completed, false);
});
