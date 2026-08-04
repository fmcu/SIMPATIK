import assert from "node:assert/strict";
import test from "node:test";

import express, { type RequestHandler } from "express";
import request from "supertest";
import type { Role } from "@simpatik/contracts";

import { auth, type AuthSession } from "../modules/auth/auth.js";
import type { AuthRequest } from "./auth.types.js";
import { errorHandler } from "./error-handler.js";
import { createRequireSession, enforceUptScope, requireRole } from "./auth.js";

function sessionFor(role: Role, uptId: string | null = null, active = true): AuthSession {
  return {
    session: {
      id: "session-id",
      userId: "user-id",
      token: "session-token",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: "user-id",
      name: "Pengguna Uji",
      email: "uji@example.test",
      emailVerified: true,
      role,
      uptId,
      active,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } as unknown as AuthSession;
}

function createProtectedApp(getSession: typeof auth.api.getSession, middleware: RequestHandler) {
  const app = express();
  app.use(express.json());
  app.get("/protected", createRequireSession(getSession), middleware, (request, response) => {
    response.json({
      data: {
        role: (request as AuthRequest).auth?.user.role,
        uptScopeId: (request as AuthRequest).uptScopeId,
      },
      meta: {},
    });
  });
  app.post("/reports", createRequireSession(getSession), enforceUptScope, (request, response) => {
    response.json({ data: { uptScopeId: (request as AuthRequest).uptScopeId }, meta: {} });
  });
  app.get(
    "/reports/:uptId",
    createRequireSession(getSession),
    enforceUptScope,
    (request, response) => {
      response.json({ data: { uptScopeId: (request as AuthRequest).uptScopeId }, meta: {} });
    },
  );
  app.use(errorHandler);
  return app;
}

test("requireSession returns the standard error when a session is absent", async () => {
  const getSession = (async () => null) as typeof auth.api.getSession;
  const app = createProtectedApp(getSession, (_request, _response, next) => next());
  const response = await request(app).get("/protected");

  assert.equal(response.status, 401);
  assert.deepEqual(response.body.error, {
    code: "AUTHENTICATION_REQUIRED",
    message: "Sesi login diperlukan.",
    fields: [],
  });
});

test("requireSession rejects an inactive account without exposing account state", async () => {
  const getSession = (async () =>
    sessionFor("PETUGAS_UPT", "upt-a", false)) as typeof auth.api.getSession;
  const app = createProtectedApp(getSession, (_request, _response, next) => next());
  const response = await request(app).get("/protected");

  assert.equal(response.status, 401);
  assert.deepEqual(response.body.error, {
    code: "AUTHENTICATION_REQUIRED",
    message: "Sesi login diperlukan.",
    fields: [],
  });
});

test("requireRole rejects a role outside the explicit allowlist", async () => {
  const getSession = (async () => sessionFor("SYSTEM_ADMIN")) as typeof auth.api.getSession;
  const app = createProtectedApp(getSession, requireRole("PETUGAS_KANWIL"));
  const response = await request(app).get("/protected");

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "ROLE_NOT_ALLOWED");
});

test("administrative routes reject Product Owner", async () => {
  const getSession = (async () => sessionFor("PRODUCT_OWNER")) as typeof auth.api.getSession;
  const app = createProtectedApp(getSession, requireRole("ADMIN_SIMPATIK"));
  const response = await request(app).get("/protected");

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "ROLE_NOT_ALLOWED");
});

test("approval routes reject Admin", async () => {
  const getSession = (async () => sessionFor("ADMIN_SIMPATIK")) as typeof auth.api.getSession;
  const app = createProtectedApp(getSession, requireRole("PRODUCT_OWNER"));
  const response = await request(app).get("/protected");

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "ROLE_NOT_ALLOWED");
});

test("enforceUptScope derives the scope from session for the assigned UPT", async () => {
  const getSession = (async () => sessionFor("PETUGAS_UPT", "upt-a")) as typeof auth.api.getSession;
  const app = createProtectedApp(getSession, enforceUptScope);
  const response = await request(app).get("/reports/upt-a");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { uptScopeId: "upt-a" });
});

test("enforceUptScope rejects a request for another UPT", async () => {
  const getSession = (async () =>
    sessionFor("KOORDINATOR_UPT", "upt-a")) as typeof auth.api.getSession;
  const app = createProtectedApp(getSession, enforceUptScope);
  const response = await request(app).get("/reports/upt-b");

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "UPT_SCOPE_FORBIDDEN");
});

test("enforceUptScope rejects a client body that attempts to change UPT", async () => {
  const getSession = (async () => sessionFor("PETUGAS_UPT", "upt-a")) as typeof auth.api.getSession;
  const app = createProtectedApp(getSession, enforceUptScope);
  const response = await request(app).post("/reports").send({ uptId: "upt-b" });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "UPT_SCOPE_FORBIDDEN");
});
