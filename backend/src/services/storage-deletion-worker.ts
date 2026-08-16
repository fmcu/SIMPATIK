import type { PrismaClient } from "@prisma/client";

import { writeLog } from "../middleware/logger.js";
import type { PrivateStorageAdapter } from "./private-storage.service.js";

export type StorageDeletionTaskRecord = {
  id: string;
  storageKey: string;
  attempts: number;
  repeatUntilCancelled: boolean;
};

export interface StorageDeletionTaskRepository {
  listDue(now: Date, limit: number): Promise<StorageDeletionTaskRecord[]>;
  claim(
    taskId: string,
    expectedAttempts: number,
    now: Date,
    leaseUntil: Date,
  ): Promise<number | null>;
  complete(taskId: string, claimedAttempts: number, leaseUntil: Date): Promise<void>;
  reschedule(
    taskId: string,
    claimedAttempts: number,
    leaseUntil: Date,
    nextAttemptAt: Date,
  ): Promise<void>;
}

export class PrismaStorageDeletionTaskRepository implements StorageDeletionTaskRepository {
  constructor(private readonly database: PrismaClient) {}

  listDue(now: Date, limit: number): Promise<StorageDeletionTaskRecord[]> {
    return this.database.storageDeletionTask.findMany({
      where: { nextAttemptAt: { lte: now } },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      take: limit,
      select: { id: true, storageKey: true, attempts: true, repeatUntilCancelled: true },
    });
  }

  async claim(
    taskId: string,
    expectedAttempts: number,
    now: Date,
    leaseUntil: Date,
  ): Promise<number | null> {
    const claimed = await this.database.storageDeletionTask.updateMany({
      where: { id: taskId, attempts: expectedAttempts, nextAttemptAt: { lte: now } },
      data: { attempts: { increment: 1 }, nextAttemptAt: leaseUntil },
    });
    return claimed.count === 1 ? expectedAttempts + 1 : null;
  }

  async complete(taskId: string, claimedAttempts: number, leaseUntil: Date): Promise<void> {
    await this.database.storageDeletionTask.deleteMany({
      where: { id: taskId, attempts: claimedAttempts, nextAttemptAt: leaseUntil },
    });
  }

  async reschedule(
    taskId: string,
    claimedAttempts: number,
    leaseUntil: Date,
    nextAttemptAt: Date,
  ): Promise<void> {
    await this.database.storageDeletionTask.updateMany({
      where: { id: taskId, attempts: claimedAttempts, nextAttemptAt: leaseUntil },
      data: { nextAttemptAt },
    });
  }
}

export type StorageDeletionWorkerOptions = {
  intervalMs?: number;
  batchSize?: number;
  claimTtlMs?: number;
  repeatPollMs?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  now?: () => Date;
};

const DEFAULT_INTERVAL_MS = 30_000;
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_CLAIM_TTL_MS = 5 * 60 * 1_000;
const DEFAULT_REPEAT_POLL_MS = 30_000;
const DEFAULT_BASE_BACKOFF_MS = 1_000;
const DEFAULT_MAX_BACKOFF_MS = 60 * 60 * 1_000;

function logWorkerFailure(
  operation: "delete_object" | "complete_task" | "reschedule_task" | "run",
  error: unknown,
  task?: StorageDeletionTaskRecord,
): void {
  writeLog("error", "storage_deletion_worker_failed", {
    operation,
    errorName: error instanceof Error ? error.name : "UnknownError",
    ...(task === undefined ? {} : { taskId: task.id, attempts: task.attempts }),
  });
}

export class StorageDeletionWorker {
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly claimTtlMs: number;
  private readonly repeatPollMs: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly now: () => Date;
  private timer: NodeJS.Timeout | undefined;
  private inFlight: Promise<void> | undefined;

  constructor(
    private readonly repository: StorageDeletionTaskRepository,
    private readonly storage: Pick<PrivateStorageAdapter, "delete">,
    options: StorageDeletionWorkerOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.claimTtlMs = options.claimTtlMs ?? DEFAULT_CLAIM_TTL_MS;
    this.repeatPollMs = options.repeatPollMs ?? DEFAULT_REPEAT_POLL_MS;
    this.baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    this.now = options.now ?? (() => new Date());
  }

  start(): void {
    if (this.timer !== undefined) return;

    this.timer = setInterval(() => {
      void this.runOnce().catch((error: unknown) => logWorkerFailure("run", error));
    }, this.intervalMs);
    this.timer.unref();
    void this.runOnce().catch((error: unknown) => logWorkerFailure("run", error));
  }

  async stop(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.inFlight;
  }

  runOnce(): Promise<void> {
    if (this.inFlight !== undefined) return this.inFlight;

    const run = (async () => {
      try {
        await this.processDueTasks();
      } finally {
        this.inFlight = undefined;
      }
    })();
    this.inFlight = run;
    return run;
  }

  private backoffMs(attempts: number): number {
    const exponent = Math.min(Math.max(attempts - 1, 0), 30);
    return Math.min(this.maxBackoffMs, this.baseBackoffMs * 2 ** exponent);
  }

  private async processDueTasks(): Promise<void> {
    const now = this.now();
    const tasks = await this.repository.listDue(now, this.batchSize);
    for (const task of tasks) {
      const claimNow = this.now();
      const leaseUntil = new Date(claimNow.getTime() + this.claimTtlMs);
      const claimedAttempts = await this.repository.claim(
        task.id,
        task.attempts,
        claimNow,
        leaseUntil,
      );
      if (claimedAttempts === null) continue;

      const claimedTask = { ...task, attempts: claimedAttempts };
      try {
        await this.storage.delete(task.storageKey);
      } catch (error) {
        logWorkerFailure("delete_object", error, claimedTask);
        const nextAttemptAt = new Date(this.now().getTime() + this.backoffMs(claimedAttempts));
        try {
          await this.repository.reschedule(task.id, claimedAttempts, leaseUntil, nextAttemptAt);
        } catch (rescheduleError) {
          logWorkerFailure("reschedule_task", rescheduleError, claimedTask);
        }
        continue;
      }

      if (task.repeatUntilCancelled) {
        const nextAttemptAt = new Date(this.now().getTime() + this.repeatPollMs);
        try {
          await this.repository.reschedule(task.id, claimedAttempts, leaseUntil, nextAttemptAt);
        } catch (error) {
          logWorkerFailure("reschedule_task", error, claimedTask);
        }
        continue;
      }

      try {
        await this.repository.complete(task.id, claimedAttempts, leaseUntil);
      } catch (error) {
        logWorkerFailure("complete_task", error, claimedTask);
      }
    }
  }
}
