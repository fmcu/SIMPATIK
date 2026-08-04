export type DatabaseReadinessClient = {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

export async function checkDatabase(client: DatabaseReadinessClient): Promise<void> {
  await client.$queryRaw`SELECT 1`;
}
