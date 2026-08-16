import type { Server } from "node:http";

import { createApp } from "./app.js";
import { environment } from "./config/environment.js";
import { prisma } from "./config/prisma.js";
import {
  createPrivateStorageAdapter,
  type ManagedPrivateStorageAdapter,
} from "./services/private-storage.service.js";
import { checkDatabase } from "./services/readiness.service.js";
import {
  PrismaStorageDeletionTaskRepository,
  StorageDeletionWorker,
} from "./services/storage-deletion-worker.js";

function log(level: "info" | "error", message: string, fields: Record<string, unknown> = {}): void {
  const output = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  });
  if (level === "error") console.error(output);
  else console.log(output);
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

async function closeServer(target: Server | undefined): Promise<void> {
  if (!target?.listening) return;
  await new Promise<void>((resolve, reject) => {
    target.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function listen(target: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      target.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      target.off("error", onError);
      resolve();
    };
    target.once("error", onError);
    target.once("listening", onListening);
  });
}

let server: Server | undefined;
let storage: ManagedPrivateStorageAdapter | undefined;
let deletionWorker: StorageDeletionWorker | undefined;
let shutdownRequested = false;
let requestedExitCode = 0;
let startupPromise: Promise<void> = Promise.resolve();
let closeRuntimePromise: Promise<void> | undefined;
let shutdownPromise: Promise<void> | undefined;

function closeRuntime(): Promise<void> {
  if (closeRuntimePromise) return closeRuntimePromise;

  closeRuntimePromise = (async () => {
    const failures: unknown[] = [];
    const stopping = await Promise.allSettled([
      closeServer(server),
      deletionWorker?.stop() ?? Promise.resolve(),
    ]);
    stopping.forEach((result) => {
      if (result.status === "rejected") failures.push(result.reason);
    });

    try {
      storage?.close();
    } catch (error) {
      failures.push(error);
    }

    try {
      await prisma.$disconnect();
    } catch (error) {
      failures.push(error);
    }

    if (failures.length > 0) throw new AggregateError(failures, "Runtime shutdown failed");
  })();
  return closeRuntimePromise;
}

async function shutdown(reason: string, exitCode = 0): Promise<void> {
  shutdownRequested = true;
  requestedExitCode = Math.max(requestedExitCode, exitCode);
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    log("info", "server_shutdown_started", { reason });
    const forceExit = setTimeout(() => {
      log("error", "server_shutdown_timeout", { reason });
      process.exit(1);
    }, 45_000);
    forceExit.unref();

    await startupPromise.catch(() => undefined);
    try {
      await closeRuntime();
    } catch (error) {
      requestedExitCode = 1;
      log("error", "server_shutdown_failed", { reason, errorName: errorName(error) });
    } finally {
      clearTimeout(forceExit);
    }

    log("info", "server_shutdown_completed", { reason });
    process.exit(requestedExitCode);
  })();
  return shutdownPromise;
}

async function start(): Promise<void> {
  storage = createPrivateStorageAdapter(environment.storageConfig);
  await Promise.all([checkDatabase(prisma), storage.check()]);
  if (shutdownRequested) return;

  deletionWorker = new StorageDeletionWorker(
    new PrismaStorageDeletionTaskRepository(prisma),
    storage,
  );
  server = createApp({ database: prisma, storage }).listen(environment.PORT);
  await listen(server);
  if (shutdownRequested) return;

  server.on("error", (error) => {
    log("error", "server_runtime_failed", { errorName: errorName(error) });
    void shutdown("SERVER_ERROR", 1);
  });
  deletionWorker.start();
  log("info", "server_started", {
    port: environment.PORT,
    environment: environment.NODE_ENV,
    storageDriver: environment.storageConfig.driver,
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

startupPromise = start();
void startupPromise.catch((error: unknown) => {
  log("error", "server_startup_failed", { errorName: errorName(error) });
  void shutdown("STARTUP_ERROR", 1);
});
