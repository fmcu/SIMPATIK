import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";
import type { Role } from "@simpatik/contracts";

import type { AuthRequest } from "../../middleware/auth.types.js";
import type { AuthSession } from "../auth/auth.js";
import { errorHandler } from "../../middleware/error-handler.js";
import {
  createAttachmentRouter,
  createReportAttachmentRouter,
  type AttachmentRouteController,
} from "./attachment.routes.js";

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

function controller(): Pick<AttachmentRouteController, "upload" | "download" | "delete"> {
  return {
    upload: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
    download: async (_request, response) => {
      response.status(200).end();
    },
    delete: async (_request, response) => {
      response.json({ data: {}, meta: {} });
    },
  };
}

function app(role: Role, uptId: string | null = null) {
  const instance = express();
  instance.use(
    "/api/reports/:id/attachments",
    createReportAttachmentRouter({ controller: controller(), requireSession: session(role, uptId) }),
  );
  instance.use(
    "/api/attachments",
    createAttachmentRouter({ controller: controller(), requireSession: session(role, uptId) }),
  );
  instance.use(errorHandler);
  return instance;
}

test("attachment routes reject Koordinator UPT upload and delete", async () => {
  const instance = app("KOORDINATOR_UPT", "upt-a");
  const upload = await request(instance).post("/api/reports/report-1/attachments");
  const remove = await request(instance).delete("/api/attachments/attachment-1");

  assert.equal(upload.status, 403);
  assert.equal(remove.status, 403);
  assert.equal(upload.body.error.code, "ROLE_NOT_ALLOWED");
  assert.equal(remove.body.error.code, "ROLE_NOT_ALLOWED");
});

test("attachment routes reject System Administrator download", async () => {
  const response = await request(app("SYSTEM_ADMIN")).get("/api/attachments/attachment-1/download");

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "ROLE_NOT_ALLOWED");
});

test("attachment upload derives UPT scope from the session", async () => {
  const scopes: Array<string | undefined> = [];
  const scopedController: Pick<AttachmentRouteController, "upload" | "download" | "delete"> = {
    ...controller(),
    upload: async (request, response) => {
      scopes.push((request as AuthRequest).uptScopeId);
      response.json({ data: {}, meta: {} });
    },
  };
  const instance = express();
  instance.use(
    "/api/reports/:id/attachments",
    createReportAttachmentRouter({
      controller: scopedController,
      requireSession: session("PETUGAS_UPT", "upt-a"),
    }),
  );
  instance.use(errorHandler);

  const response = await request(instance).post("/api/reports/report-1/attachments");

  assert.equal(response.status, 200);
  assert.deepEqual(scopes, ["upt-a"]);
});
