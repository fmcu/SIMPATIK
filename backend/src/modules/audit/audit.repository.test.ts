import assert from "node:assert/strict";
import test from "node:test";

import { createAuditLogReader } from "./audit.repository.js";

test("audit log reader filters safely and returns newest entries", async () => {
  let findManyArgs: Record<string, unknown> | undefined;
  let countArgs: Record<string, unknown> | undefined;
  const createdAt = new Date("2026-08-09T10:00:00.000Z");
  const database = {
    auditLog: {
      findMany: async (args: Record<string, unknown>) => {
        findManyArgs = args;
        return [
          {
            id: "audit-1",
            action: "USER_UPDATED",
            entityType: "User",
            entityId: "user-1",
            createdAt,
            actor: { id: "admin-1", name: "Admin", email: "admin@example.test" },
          },
        ];
      },
      count: async (args: Record<string, unknown>) => {
        countArgs = args;
        return 1;
      },
    },
  };

  const result = await createAuditLogReader(database).list({
    skip: 10,
    take: 5,
    action: "USER_UPDATED",
    entityType: "User",
    search: "admin",
  });

  const where = {
    action: "USER_UPDATED",
    entityType: "User",
    OR: [
      { actor: { name: { contains: "admin", mode: "insensitive" } } },
      { actor: { email: { contains: "admin", mode: "insensitive" } } },
      { entityId: { contains: "admin", mode: "insensitive" } },
    ],
  };
  assert.deepEqual(findManyArgs, {
    where,
    skip: 10,
    take: 5,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      actor: { select: { id: true, name: true, email: true } },
    },
  });
  assert.deepEqual(countArgs, { where });
  assert.deepEqual(result, {
    items: [
      {
        id: "audit-1",
        action: "USER_UPDATED",
        entityType: "User",
        entityId: "user-1",
        createdAt,
        actor: { id: "admin-1", name: "Admin", email: "admin@example.test" },
      },
    ],
    total: 1,
  });
});
