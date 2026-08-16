import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";
import type { Role } from "@simpatik/contracts";

import type { AuthRequest } from "../middleware/auth.types.js";
import type { AuthSession } from "../modules/auth/auth.js";
import { errorHandler } from "../middleware/error-handler.js";
import type { PrivateStorageAdapter } from "../services/private-storage.service.js";
import {
  createReportRouter,
  type ReportControllerHandlers,
} from "../modules/reports/report.routes.js";

const roles: Role[] = [
  "PIMPINAN",
  "PRODUCT_OWNER",
  "PETUGAS_KANWIL",
  "KOORDINATOR_UPT",
  "PETUGAS_UPT",
  "ADMIN_SIMPATIK",
  "SYSTEM_ADMIN",
];

const storage: PrivateStorageAdapter = {
  async write(): Promise<void> {},
  async read(): Promise<never> {
    throw new Error("not used");
  },
  async delete(): Promise<void> {},
};

const allowed = {
  list: new Set<Role>([
    "PIMPINAN",
    "PRODUCT_OWNER",
    "PETUGAS_KANWIL",
    "KOORDINATOR_UPT",
    "PETUGAS_UPT",
  ]),
  create: new Set<Role>(["PETUGAS_UPT"]),
  submit: new Set<Role>(["KOORDINATOR_UPT"]),
  review: new Set<Role>(["PETUGAS_KANWIL"]),
  approve: new Set<Role>(["PRODUCT_OWNER"]),
};

function controller(): ReportControllerHandlers {
  const response = async (_request: express.Request, reply: express.Response): Promise<void> => {
    reply.json({ data: {}, meta: {} });
  };
  return {
    list: response,
    create: response,
    detail: response,
    history: response,
    validateCompleteness: response,
    submit: response,
    update: response,
    addReviewComment: response,
    requestRevision: response,
    markReviewed: response,
    approve: response,
  };
}

function app(role: Role) {
  const instance = express();
  instance.use(express.json());
  instance.use(
    "/api/reports",
    createReportRouter({
      controller: controller(),
      storage,
      requireSession: (request, _response, next) => {
        (request as AuthRequest).auth = {
          session: {} as AuthSession,
          user: {
            id: `user-${role}`,
            name: role,
            email: `${role.toLowerCase()}@example.test`,
            role,
            uptId: role === "PETUGAS_UPT" || role === "KOORDINATOR_UPT" ? "upt-a" : null,
            active: true,
          },
        };
        next();
      },
    }),
  );
  instance.use(errorHandler);
  return instance;
}

test("seven-role API E2E matrix covers login session, workflow actions, and System Administrator denial", async () => {
  for (const role of roles) {
    const instance = app(role);
    const list = await request(instance).get("/api/reports");
    const create = await request(instance)
      .post("/api/reports")
      .send({ periodId: "period-1", reportType: "BULANAN" });
    const submit = await request(instance).post("/api/reports/report-1/submit");
    const revision = await request(instance)
      .post("/api/reports/report-1/request-revision")
      .send({ message: "Catatan" });
    const reviewed = await request(instance).post("/api/reports/report-1/mark-reviewed");
    const approve = await request(instance).post("/api/reports/report-1/approve");

    assert.equal(list.status, allowed.list.has(role) ? 200 : 403, `${role} report menu access`);
    assert.equal(create.status, allowed.create.has(role) ? 200 : 403, `${role} draft access`);
    assert.equal(submit.status, allowed.submit.has(role) ? 200 : 403, `${role} submit access`);
    assert.equal(revision.status, allowed.review.has(role) ? 200 : 403, `${role} revision access`);
    assert.equal(reviewed.status, allowed.review.has(role) ? 200 : 403, `${role} reviewed access`);
    assert.equal(approve.status, allowed.approve.has(role) ? 200 : 403, `${role} approval access`);
  }
});
