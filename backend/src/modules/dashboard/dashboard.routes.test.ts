import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";
import type { Role } from "@simpatik/contracts";

import type { AuthRequest } from "../../middleware/auth.types.js";
import type { AuthSession } from "../auth/auth.js";
import { errorHandler } from "../../middleware/error-handler.js";
import { createDashboardRouter } from "./dashboard.routes.js";
import { createExportRouter } from "../exports/export.routes.js";

function session(role: Role, uptId: string | null = null) {
  return (request: express.Request, _response: express.Response, next: express.NextFunction) => {
    (request as AuthRequest).auth = {
      session: {} as AuthSession,
      user: {
        id: "user-1",
        name: "Pengguna Uji",
        email: "uji@example.test",
        role,
        uptId,
        active: true,
      },
    };
    next();
  };
}

function app(role: Role, uptId: string | null = null) {
  const instance = express();
  instance.use("/api/dashboard", createDashboardRouter({ requireSession: session(role, uptId) }));
  instance.use("/api/exports", createExportRouter({ requireSession: session(role, uptId) }));
  instance.use(errorHandler);
  return instance;
}

test("dashboard and export routes reject System Administrator", async () => {
  const dashboard = await request(app("SYSTEM_ADMIN")).get("/api/dashboard/summary");
  const csv = await request(app("SYSTEM_ADMIN")).get("/api/exports/reports.csv");

  assert.equal(dashboard.status, 403);
  assert.equal(csv.status, 403);
  assert.equal(dashboard.body.error.code, "ROLE_NOT_ALLOWED");
  assert.equal(csv.body.error.code, "ROLE_NOT_ALLOWED");
});

test("dashboard routes reject a cross-UPT filter", async () => {
  const summary = await request(app("PETUGAS_UPT", "upt-a")).get(
    "/api/dashboard/summary?uptId=upt-b",
  );
  const byUpt = await request(app("KOORDINATOR_UPT", "upt-a")).get(
    "/api/dashboard/by-upt?uptId=upt-b",
  );
  const csv = await request(app("KOORDINATOR_UPT", "upt-a")).get(
    "/api/exports/reports.csv?uptId=upt-b",
  );

  assert.equal(summary.status, 403);
  assert.equal(byUpt.status, 403);
  assert.equal(csv.status, 403);
  assert.equal(summary.body.error.code, "UPT_SCOPE_FORBIDDEN");
  assert.equal(byUpt.body.error.code, "UPT_SCOPE_FORBIDDEN");
  assert.equal(csv.body.error.code, "UPT_SCOPE_FORBIDDEN");
});
