import assert from "node:assert/strict";
import test from "node:test";

import {
  PrismaStorageDeletionTaskRepository,
  StorageDeletionWorker,
  type StorageDeletionTaskRecord,
  type StorageDeletionTaskRepository,
} from "./storage-deletion-worker.js";

type Claim = {
  taskId: string;
  expectedAttempts: number;
  now: Date;
  leaseUntil: Date;
};

type Completion = {
  taskId: string;
  claimedAttempts: number;
  leaseUntil: Date;
};

type Reschedule = Completion & {
  nextAttemptAt: Date;
};

function repository(tasks: StorageDeletionTaskRecord[]): StorageDeletionTaskRepository & {
  listed: Array<{ now: Date; limit: number }>;
  claims: Claim[];
  completed: Completion[];
  rescheduled: Reschedule[];
} {
  const listed: Array<{ now: Date; limit: number }> = [];
  const claims: Claim[] = [];
  const completed: Completion[] = [];
  const rescheduled: Reschedule[] = [];
  return {
    listed,
    claims,
    completed,
    rescheduled,
    listDue: async (now, limit) => {
      listed.push({ now, limit });
      return tasks;
    },
    claim: async (taskId, expectedAttempts, now, leaseUntil) => {
      claims.push({ taskId, expectedAttempts, now, leaseUntil });
      return expectedAttempts + 1;
    },
    complete: async (taskId, claimedAttempts, leaseUntil) => {
      completed.push({ taskId, claimedAttempts, leaseUntil });
    },
    reschedule: async (taskId, claimedAttempts, leaseUntil, nextAttemptAt) => {
      rescheduled.push({ taskId, claimedAttempts, leaseUntil, nextAttemptAt });
    },
  };
}

const task: StorageDeletionTaskRecord = {
  id: "task-1",
  storageKey: "attachments/00000000-0000-0000-0000-000000000001",
  attempts: 0,
  repeatUntilCancelled: false,
};

test("Prisma repository atomically claims a due task", async () => {
  const now = new Date("2026-08-16T00:00:00.000Z");
  const leaseUntil = new Date("2026-08-16T00:05:00.000Z");
  let updatedWhere: unknown;
  let updatedData: unknown;
  const database = {
    storageDeletionTask: {
      updateMany: async ({ where, data }: { where: unknown; data: unknown }) => {
        updatedWhere = where;
        updatedData = data;
        return { count: 1 };
      },
    },
  };
  const repository = new PrismaStorageDeletionTaskRepository(
    database as unknown as ConstructorParameters<typeof PrismaStorageDeletionTaskRepository>[0],
  );

  const claimedAttempts = await repository.claim(task.id, 0, now, leaseUntil);

  assert.equal(claimedAttempts, 1);
  assert.deepEqual(updatedWhere, {
    id: task.id,
    attempts: 0,
    nextAttemptAt: { lte: now },
  });
  assert.deepEqual(updatedData, {
    attempts: { increment: 1 },
    nextAttemptAt: leaseUntil,
  });
});

test("Prisma repository reports a lost claim race", async () => {
  const database = {
    storageDeletionTask: {
      updateMany: async () => ({ count: 0 }),
    },
  };
  const repository = new PrismaStorageDeletionTaskRepository(
    database as unknown as ConstructorParameters<typeof PrismaStorageDeletionTaskRepository>[0],
  );

  const claimedAttempts = await repository.claim(task.id, 0, new Date(), new Date());

  assert.equal(claimedAttempts, null);
});

test("Prisma repository completion is fenced by the active claim", async () => {
  const leaseUntil = new Date("2026-08-16T00:05:00.000Z");
  let deletedWhere: unknown;
  const database = {
    storageDeletionTask: {
      deleteMany: async ({ where }: { where: unknown }) => {
        deletedWhere = where;
        return { count: 1 };
      },
    },
  };
  const repository = new PrismaStorageDeletionTaskRepository(
    database as unknown as ConstructorParameters<typeof PrismaStorageDeletionTaskRepository>[0],
  );

  await repository.complete(task.id, 1, leaseUntil);

  assert.deepEqual(deletedWhere, { id: task.id, attempts: 1, nextAttemptAt: leaseUntil });
});

test("Prisma repository reschedule is fenced by the active claim", async () => {
  const leaseUntil = new Date("2026-08-16T00:05:00.000Z");
  const nextAttemptAt = new Date("2026-08-16T00:00:01.000Z");
  let updatedWhere: unknown;
  let updatedData: unknown;
  const database = {
    storageDeletionTask: {
      updateMany: async ({ where, data }: { where: unknown; data: unknown }) => {
        updatedWhere = where;
        updatedData = data;
        return { count: 1 };
      },
    },
  };
  const repository = new PrismaStorageDeletionTaskRepository(
    database as unknown as ConstructorParameters<typeof PrismaStorageDeletionTaskRepository>[0],
  );

  await repository.reschedule(task.id, 1, leaseUntil, nextAttemptAt);

  assert.deepEqual(updatedWhere, { id: task.id, attempts: 1, nextAttemptAt: leaseUntil });
  assert.deepEqual(updatedData, { nextAttemptAt });
});

test("storage deletion worker claims, deletes, then completes a task", async () => {
  const now = new Date("2026-08-16T00:00:00.000Z");
  const leaseUntil = new Date("2026-08-16T00:05:00.000Z");
  const tasks = repository([task]);
  const deleted: string[] = [];
  const worker = new StorageDeletionWorker(
    tasks,
    {
      delete: async (storageKey) => {
        deleted.push(storageKey);
      },
    },
    { now: () => now },
  );

  await worker.runOnce();

  assert.deepEqual(tasks.listed, [{ now, limit: 25 }]);
  assert.deepEqual(tasks.claims, [{ taskId: task.id, expectedAttempts: 0, now, leaseUntil }]);
  assert.deepEqual(deleted, [task.storageKey]);
  assert.deepEqual(tasks.completed, [{ taskId: task.id, claimedAttempts: 1, leaseUntil }]);
  assert.deepEqual(tasks.rescheduled, []);
});

test("storage deletion worker reschedules a successful repeat tombstone without completing it", async () => {
  const now = new Date("2026-08-16T00:00:00.000Z");
  const leaseUntil = new Date("2026-08-16T00:05:00.000Z");
  const tasks = repository([{ ...task, repeatUntilCancelled: true }]);
  const deleted: string[] = [];
  const worker = new StorageDeletionWorker(
    tasks,
    {
      delete: async (storageKey) => {
        deleted.push(storageKey);
      },
    },
    { now: () => now },
  );

  await worker.runOnce();

  assert.deepEqual(deleted, [task.storageKey]);
  assert.deepEqual(tasks.completed, []);
  assert.deepEqual(tasks.rescheduled, [
    {
      taskId: task.id,
      claimedAttempts: 1,
      leaseUntil,
      nextAttemptAt: new Date("2026-08-16T00:00:30.000Z"),
    },
  ]);
});

test("storage deletion worker honors a configured repeat polling interval", async () => {
  const now = new Date("2026-08-16T00:00:00.000Z");
  const tasks = repository([{ ...task, repeatUntilCancelled: true }]);
  const worker = new StorageDeletionWorker(
    tasks,
    { delete: async () => undefined },
    { now: () => now, repeatPollMs: 12_000 },
  );

  await worker.runOnce();

  assert.equal(tasks.rescheduled[0]?.nextAttemptAt.getTime(), now.getTime() + 12_000);
  assert.deepEqual(tasks.completed, []);
});

test("storage deletion worker never completes a repeat tombstone when polling reschedule fails", async () => {
  const tasks = repository([{ ...task, repeatUntilCancelled: true }]);
  tasks.reschedule = async () => {
    throw new Error("database unavailable");
  };
  const worker = new StorageDeletionWorker(tasks, { delete: async () => undefined });

  await worker.runOnce();

  assert.deepEqual(tasks.completed, []);
});

test("storage deletion worker skips a task when another instance claims it", async () => {
  const tasks = repository([task]);
  tasks.claim = async () => null;
  let deleted = false;
  const worker = new StorageDeletionWorker(tasks, {
    delete: async () => {
      deleted = true;
    },
  });

  await worker.runOnce();

  assert.equal(deleted, false);
  assert.deepEqual(tasks.completed, []);
  assert.deepEqual(tasks.rescheduled, []);
});

test("storage deletion worker applies failure backoff to repeat tombstones", async () => {
  const now = new Date("2026-08-16T00:00:00.000Z");
  const tasks = repository([{ ...task, repeatUntilCancelled: true }]);
  const worker = new StorageDeletionWorker(
    tasks,
    {
      delete: async () => {
        throw new Error("provider failure");
      },
    },
    { now: () => now, repeatPollMs: 30_000, baseBackoffMs: 1_000 },
  );

  await worker.runOnce();

  assert.deepEqual(tasks.completed, []);
  assert.equal(tasks.rescheduled[0]?.nextAttemptAt.getTime(), now.getTime() + 1_000);
});

test("storage deletion worker reschedules failure with claimed-attempt backoff", async () => {
  const now = new Date("2026-08-16T00:00:00.000Z");
  const leaseUntil = new Date("2026-08-16T00:05:00.000Z");
  const tasks = repository([
    { ...task, id: "task-first", attempts: 0 },
    { ...task, id: "task-bounded", attempts: 20 },
  ]);
  const worker = new StorageDeletionWorker(
    tasks,
    {
      delete: async () => {
        throw new Error("provider failure with private details");
      },
    },
    {
      now: () => now,
      baseBackoffMs: 1_000,
      maxBackoffMs: 8_000,
    },
  );

  await worker.runOnce();

  assert.deepEqual(tasks.completed, []);
  assert.deepEqual(tasks.rescheduled, [
    {
      taskId: "task-first",
      claimedAttempts: 1,
      leaseUntil,
      nextAttemptAt: new Date("2026-08-16T00:00:01.000Z"),
    },
    {
      taskId: "task-bounded",
      claimedAttempts: 21,
      leaseUntil,
      nextAttemptAt: new Date("2026-08-16T00:00:08.000Z"),
    },
  ]);
});

test("storage deletion worker prevents overlapping runs", async () => {
  let listCalls = 0;
  let release: (() => void) | undefined;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tasks: StorageDeletionTaskRepository = {
    listDue: async () => {
      listCalls += 1;
      await blocked;
      return [];
    },
    claim: async () => null,
    complete: async () => undefined,
    reschedule: async () => undefined,
  };
  const worker = new StorageDeletionWorker(tasks, { delete: async () => undefined });

  const first = worker.runOnce();
  const second = worker.runOnce();
  assert.equal(first, second);
  assert.equal(listCalls, 1);

  release?.();
  await Promise.all([first, second]);
  assert.equal(listCalls, 1);
});

test("storage deletion worker stop waits for an in-flight run", async () => {
  let release: (() => void) | undefined;
  let stopped = false;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tasks: StorageDeletionTaskRepository = {
    listDue: async () => {
      await blocked;
      return [];
    },
    claim: async () => null,
    complete: async () => undefined,
    reschedule: async () => undefined,
  };
  const worker = new StorageDeletionWorker(tasks, { delete: async () => undefined });

  void worker.runOnce();
  const stop = worker.stop().then(() => {
    stopped = true;
  });
  await Promise.resolve();
  assert.equal(stopped, false);

  release?.();
  await stop;
  assert.equal(stopped, true);
});
