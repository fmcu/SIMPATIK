import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";
import type { Role } from "@simpatik/contracts";

import type { AuthRequest } from "../../middleware/auth.types.js";
import type { AuthSession } from "../auth/auth.js";
import { errorHandler } from "../../middleware/error-handler.js";
import type { ReportControllerHandlers } from "./report.routes.js";
import { createReportRouter } from "./report.routes.js";

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

function controller(): ReportControllerHandlers {
  return {
    list: async (request, response) => {
      response.json({ data: { uptScopeId: (request as AuthRequest).uptScopeId }, meta: {} });
    },
    create: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
    detail: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
    history: async (_request, response) => {
      response.json({ data: [], meta: {} });
    },
    submit: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
    addReviewComment: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
    requestRevision: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
    markReviewed: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
    approve: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
    validateCompleteness: async (_request, response) => {
      response.json({ data: { valid: true }, meta: {} });
    },
    update: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
  };
}

function app(role: Role, uptId: string | null = null) {
  const instance = express();
  instance.use(express.json());
  instance.use(
    "/api/reports",
    createReportRouter({ controller: controller(), requireSession: session(role, uptId) }),
  );
  instance.use(errorHandler);
  return instance;
}

test("report routes reject System Administrator from report substance", async () => {
  const response = await request(app("SYSTEM_ADMIN")).get("/api/reports");

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "ROLE_NOT_ALLOWED");
});

test("report routes reject Koordinator UPT draft updates", async () => {
  const response = await request(app("KOORDINATOR_UPT", "upt-a"))
    .patch("/api/reports/report-1")
    .send({ version: 1, items: [{ indicatorId: "indicator-1", value: "10" }] });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "ROLE_NOT_ALLOWED");
});

test("report routes allow only Koordinator UPT to submit", async () => {
  const coordinator = await request(app("KOORDINATOR_UPT", "upt-a")).post(
    "/api/reports/report-1/submit",
  );
  const petugas = await request(app("PETUGAS_UPT", "upt-a")).post("/api/reports/report-1/submit");

  assert.equal(coordinator.status, 200);
  assert.equal(petugas.status, 403);
  assert.equal(petugas.body.error.code, "ROLE_NOT_ALLOWED");
});

test("report routes allow only Petugas Kanwil to review", async () => {
  const kanwil = await request(app("PETUGAS_KANWIL")).post(
    "/api/reports/report-1/request-revision",
  ).send({ message: "Lengkapi narasi." });
  const coordinator = await request(app("KOORDINATOR_UPT", "upt-a")).post(
    "/api/reports/report-1/request-revision",
  ).send({ message: "Lengkapi narasi." });
  const petugas = await request(app("PETUGAS_UPT", "upt-a")).post(
    "/api/reports/report-1/mark-reviewed",
  );

  assert.equal(kanwil.status, 200);
  assert.equal(coordinator.status, 403);
  assert.equal(petugas.status, 403);
  assert.equal(coordinator.body.error.code, "ROLE_NOT_ALLOWED");
  assert.equal(petugas.body.error.code, "ROLE_NOT_ALLOWED");
});

test("report routes allow only Product Owner to approve", async () => {
  const owner = await request(app("PRODUCT_OWNER")).post("/api/reports/report-1/approve");
  const kanwil = await request(app("PETUGAS_KANWIL")).post("/api/reports/report-1/approve");
  const admin = await request(app("ADMIN_SIMPATIK")).post("/api/reports/report-1/approve");

  assert.equal(owner.status, 200);
  assert.equal(kanwil.status, 403);
  assert.equal(admin.status, 403);
  assert.equal(kanwil.body.error.code, "ROLE_NOT_ALLOWED");
  assert.equal(admin.body.error.code, "ROLE_NOT_ALLOWED");
});

test("report routes require a message for comments and revisions", async () => {
  const comment = await request(app("PETUGAS_KANWIL")).post("/api/reports/report-1/comments").send({});
  const revision = await request(app("PETUGAS_KANWIL"))
    .post("/api/reports/report-1/request-revision")
    .send({ message: "   " });

  assert.equal(comment.status, 400);
  assert.equal(revision.status, 400);
  assert.equal(comment.body.error.code, "VALIDATION_ERROR");
  assert.equal(revision.body.error.code, "VALIDATION_ERROR");
});

test("report routes reject an UPT list filter for another UPT", async () => {
  const response = await request(app("PETUGAS_UPT", "upt-a")).get("/api/reports?uptId=upt-b");

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "UPT_SCOPE_FORBIDDEN");
});

test("report routes derive list scope from the UPT session", async () => {
  const response = await request(app("PETUGAS_UPT", "upt-a")).get("/api/reports");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.uptScopeId, "upt-a");
});

test("report routes pass the UPT session scope to detail and draft update handlers", async () => {
  const scopes: Array<string | undefined> = [];
  const scopedController: ReportControllerHandlers = {
    ...controller(),
    detail: async (request, response) => {
      scopes.push((request as AuthRequest).uptScopeId);
      response.json({ data: {}, meta: {} });
    },
    update: async (request, response) => {
      scopes.push((request as AuthRequest).uptScopeId);
      response.json({ data: {}, meta: {} });
    },
  };
  const instance = express();
  instance.use(express.json());
  instance.use(
    "/api/reports",
    createReportRouter({
      controller: scopedController,
      requireSession: session("PETUGAS_UPT", "upt-a"),
    }),
  );
  instance.use(errorHandler);

  const detail = await request(instance).get("/api/reports/report-b");
  const update = await request(instance)
    .patch("/api/reports/report-b")
    .send({ version: 1, items: [{ indicatorId: "indicator-1", value: "10" }] });

  assert.equal(detail.status, 200);
  assert.equal(update.status, 200);
  assert.deepEqual(scopes, ["upt-a", "upt-a"]);
});
