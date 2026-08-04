import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import { createReportRepository } from "./report.repository.js";

test("report repository applies UPT scope to list and detail queries", async () => {
  let listWhere: unknown;
  let detailWhere: unknown;
  const database = {
    report: {
      findMany: async (input: { where: unknown }) => {
        listWhere = input.where;
        return [];
      },
      count: async () => 0,
      findFirst: async (input: { where: unknown }) => {
        detailWhere = input.where;
        return null;
      },
    },
  } as unknown as PrismaClient;
  const repository = createReportRepository(database);

  await repository.list({
    skip: 0,
    take: 10,
    periodId: "period-1",
    uptId: "upt-b",
    status: "DRAFT",
    uptScopeId: "upt-a",
  });
  await repository.findById("report-b", "upt-a");

  assert.deepEqual(listWhere, { periodId: "period-1", uptId: "upt-a", status: "DRAFT" });
  assert.deepEqual(detailWhere, { id: "report-b", uptId: "upt-a" });
});
