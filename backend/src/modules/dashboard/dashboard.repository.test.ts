import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import { createDashboardRepository } from "./dashboard.repository.js";

test("dashboard by-upt query paginates UPT rows and loads one latest report per UPT", async () => {
  let uptQuery: Record<string, unknown> | undefined;
  let countQuery: Record<string, unknown> | undefined;
  const database = {
    uPT: {
      findMany: async (query: Record<string, unknown>) => {
        uptQuery = query;
        return [];
      },
      count: async (query: Record<string, unknown>) => {
        countQuery = query;
        return 12;
      },
    },
  } as unknown as PrismaClient;
  const repository = createDashboardRepository(database);

  const result = await repository.listByUpt({ periodId: "period-1" }, { skip: 25, take: 25 });

  assert.deepEqual(result, { items: [], total: 12 });
  assert.equal(uptQuery?.skip, 25);
  assert.equal(uptQuery?.take, 25);
  assert.deepEqual(countQuery, { where: { active: true } });
  const select = uptQuery?.select as { reports?: { take?: number } } | undefined;
  assert.equal(select?.reports?.take, 1);
});
