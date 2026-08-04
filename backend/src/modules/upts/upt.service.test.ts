import assert from "node:assert/strict";
import test from "node:test";
import type { UPT } from "@prisma/client";

import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { UptRepository } from "./upt.repository.js";
import { UptService } from "./upt.service.js";

const item: UPT = {
  id: "upt-1",
  code: "UPT-01",
  name: "UPT Placeholder 01",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function repository(overrides: Partial<UptRepository> = {}): UptRepository {
  return {
    list: async () => ({ items: [], total: 0 }),
    findById: async () => item,
    create: async () => item,
    update: async (_id, data) => ({ ...item, ...data }),
    ...overrides,
  };
}

test("UPT status changes are audited with the requested action", async () => {
  const events: string[] = [];
  const audit: AuditRepository = {
    write: async ({ action }) => {
      events.push(action);
    },
  };
  const service = new UptService(repository(), audit);

  await service.update("upt-1", { active: false }, "admin", "UPT_DEACTIVATED");

  assert.deepEqual(events, ["UPT_DEACTIVATED"]);
});

test("UPT updates reject unknown IDs without mutating data", async () => {
  let updateCalled = false;
  const service = new UptService(
    repository({
      findById: async () => null,
      update: async () => {
        updateCalled = true;
        return item;
      },
    }),
    { write: async () => undefined },
  );

  await assert.rejects(
    () => service.update("missing", { active: false }, "admin"),
    (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND",
  );
  assert.equal(updateCalled, false);
});
