import assert from "node:assert/strict";
import test from "node:test";

import express, { type RequestHandler } from "express";
import request from "supertest";

import type { Role } from "@simpatik/contracts";
import { createApp } from "../../app.js";
import { errorHandler } from "../../middleware/error-handler.js";
import type { AuthContext, AuthRequest } from "../../middleware/auth.types.js";
import type { AuditLogReader } from "./audit.repository.js";
import { createAuditRouter } from "./audit.routes.js";

function session(role: Role): RequestHandler {
  return (request, _response, next) => {
    (request as AuthRequest).auth = {
      session: {} as AuthContext["session"],
      user: {
        id: "actor-1",
        name: "Actor",
        email: "actor@example.test",
        role,
        uptId: null,
        active: true,
      },
    };
    next();
  };
}

const testStorage = {
  async write(): Promise<void> {},
  async read(): Promise<never> {
    throw new Error("not used");
  },
  async delete(): Promise<void> {},
  async check(): Promise<void> {},
  close(): void {},
};

function appFor(role: Role, reader: AuditLogReader) {
  const app = express();
  app.use("/api/audit", createAuditRouter(reader, session(role)));
  app.use(errorHandler);
  return app;
}

const reader: AuditLogReader = {
  list: async () => ({
    items: [
      {
        id: "audit-1",
        action: "USER_UPDATED",
        entityType: "User",
        entityId: "user-1",
        createdAt: new Date("2026-08-09T10:00:00.000Z"),
        actor: { id: "admin-1", name: "Admin", email: "admin@example.test" },
      },
    ],
    total: 1,
  }),
};

test("GET /api/audit/logs returns paginated audit entries for Admin SIMPATIK", async () => {
  const response = await request(appFor("ADMIN_SIMPATIK", reader)).get(
    "/api/audit/logs?page=2&pageSize=5&action=USER_UPDATED&entityType=User&search=admin",
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].metadata, undefined);
  assert.deepEqual(response.body.meta.pagination, {
    page: 2,
    pageSize: 5,
    total: 1,
    totalPages: 1,
  });
});

test("GET /api/audit/logs denies System Administrator", async () => {
  const response = await request(appFor("SYSTEM_ADMIN", reader)).get("/api/audit/logs");

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "ROLE_NOT_ALLOWED");
});

test("application mounts the protected audit log endpoint", async () => {
  const response = await request(createApp({ storage: testStorage })).get("/api/audit/logs");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "AUTHENTICATION_REQUIRED");
});
