import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@prisma/client";

import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { UserRepository } from "./user.repository.js";
import { UserService } from "./user.service.js";

function userRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    list: async () => ({ items: [], total: 0 }),
    findById: async () => null,
    findUpt: async () => ({ id: "upt-1", active: true }),
    create: async () =>
      ({
        id: "user-1",
        name: "User",
        email: "user@example.test",
        role: "PETUGAS_UPT",
        uptId: "upt-1",
        active: true,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as User,
    update: async () => ({}) as User,
    updatePassword: async () => undefined,
    ...overrides,
  };
}

const audit: AuditRepository = { write: async () => undefined };

const base = {
  name: "Petugas",
  email: "petugas@example.test",
  password: "password123",
  active: true,
};

test("user creation requires UPT assignment for UPT roles", async () => {
  const service = new UserService(userRepository(), audit);
  await assert.rejects(
    () => service.create({ ...base, role: "PETUGAS_UPT" }, "admin"),
    (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
  );
});

test("user creation rejects inactive UPT assignment", async () => {
  const service = new UserService(
    userRepository({ findUpt: async () => ({ id: "upt-1", active: false }) }),
    audit,
  );
  await assert.rejects(
    () => service.create({ ...base, role: "KOORDINATOR_UPT", uptId: "upt-1" }, "admin"),
    (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
  );
});

test("non-UPT role cannot receive UPT assignment", async () => {
  const service = new UserService(userRepository(), audit);
  await assert.rejects(
    () => service.create({ ...base, role: "ADMIN_SIMPATIK", uptId: "upt-1" }, "admin"),
    (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
  );
});
