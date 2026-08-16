import type { ManagedPrivateStorageAdapter } from "./private-storage.service.js";

export type DatabaseReadinessClient = {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

export type StorageReadinessClient = Pick<ManagedPrivateStorageAdapter, "check">;

export type ReadinessStatus = {
  database: "ready" | "unavailable";
  storage: "ready" | "unavailable";
};

export async function checkDatabase(client: DatabaseReadinessClient): Promise<void> {
  await client.$queryRaw`SELECT 1`;
}

export async function checkStorage(storage: StorageReadinessClient): Promise<void> {
  await storage.check();
}

export async function checkReadiness(
  database: DatabaseReadinessClient,
  storage: StorageReadinessClient,
): Promise<ReadinessStatus> {
  const [databaseResult, storageResult] = await Promise.allSettled([
    checkDatabase(database),
    checkStorage(storage),
  ]);

  return {
    database: databaseResult.status === "fulfilled" ? "ready" : "unavailable",
    storage: storageResult.status === "fulfilled" ? "ready" : "unavailable",
  };
}
