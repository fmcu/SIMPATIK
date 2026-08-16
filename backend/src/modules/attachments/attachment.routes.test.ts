import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, get, type Server } from "node:http";
import { PassThrough, Readable } from "node:stream";
import test from "node:test";

import express from "express";
import request from "supertest";
import type { Role } from "@simpatik/contracts";

import type { AuthRequest } from "../../middleware/auth.types.js";
import type { AuthSession } from "../auth/auth.js";
import { errorHandler } from "../../middleware/error-handler.js";
import type { AttachmentService } from "./attachment.service.js";
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
    createReportAttachmentRouter({
      controller: controller(),
      requireSession: session(role, uptId),
    }),
  );
  instance.use(
    "/api/attachments",
    createAttachmentRouter({ controller: controller(), requireSession: session(role, uptId) }),
  );
  instance.use(errorHandler);
  return instance;
}

const attachment = {
  id: "attachment-1",
  reportItemId: null,
  requirementId: null,
  originalName: "bukti laporan.pdf",
  mimeType: "application/pdf",
  size: 7,
  createdAt: new Date(),
  uploadedBy: { id: "user-1", name: "Petugas" },
  requirement: null,
  storageKey: "attachments/private-key",
  report: { id: "report-1", status: "APPROVED" as const },
};

function downloadService(stream: Readable): AttachmentService {
  return {
    download: async () => ({ attachment, stream }),
  } as unknown as AttachmentService;
}

function downloadApp(stream: Readable) {
  const instance = express();
  instance.use(
    "/api/attachments",
    createAttachmentRouter({
      service: downloadService(stream),
      requireSession: session("PETUGAS_KANWIL"),
    }),
  );
  instance.use(errorHandler);
  return instance;
}

async function listen(instance: express.Express): Promise<Server> {
  const server = createServer(instance);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

async function close(server: Server): Promise<void> {
  server.close();
  await once(server, "close");
}

function serverUrl(server: Server): URL {
  const address = server.address();
  assert(address && typeof address !== "string");
  return new URL(`http://127.0.0.1:${address.port}`);
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

test("attachment download streams content and headers", async () => {
  const response = await request(downloadApp(Readable.from(["content"]))).get(
    "/api/attachments/attachment-1/download",
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, Buffer.from("content"));
  assert.equal(response.headers["content-type"], "application/pdf");
  assert.equal(response.headers["content-length"], "7");
  assert.equal(
    response.headers["content-disposition"],
    "attachment; filename=\"bukti laporan.pdf\"; filename*=UTF-8''bukti%20laporan.pdf",
  );
});

test("attachment download delegates a source error before headers commit", async () => {
  const source = new PassThrough();
  source.on("error", () => undefined);
  source.destroy(new Error("storage stream failed before content"));

  const response = await request(downloadApp(source)).get("/api/attachments/attachment-1/download");

  assert.equal(response.status, 503);
  assert.equal(response.headers["content-type"]?.startsWith("application/json"), true);
  assert.equal(response.body.error.code, "STORAGE_UNAVAILABLE");
  assert.equal(response.body.error.message, "Penyimpanan file privat sementara tidak tersedia.");
  assert.equal(
    JSON.stringify(response.body).includes("storage stream failed before content"),
    false,
  );
});

test("attachment download closes the response after a midstream source error", async () => {
  const source = new PassThrough();
  const instance = downloadApp(source);
  const server = await listen(instance);

  try {
    const responsePromise = fetch(
      new URL("/api/attachments/attachment-1/download", serverUrl(server)),
    );
    source.write("part");
    const response = await responsePromise;
    const reader = response.body?.getReader();
    assert(reader);
    assert.deepEqual(await reader.read(), {
      done: false,
      value: new TextEncoder().encode("part"),
    });
    source.destroy(new Error("storage stream failed midstream"));

    assert.equal(response.status, 200);
    await assert.rejects(() => reader.read());
  } finally {
    source.destroy();
    await close(server);
  }
});

test("attachment download destroys the source when the client aborts", async () => {
  const source = new PassThrough();
  const server = await listen(downloadApp(source));

  try {
    const responseReceived = new Promise<void>((resolve, reject) => {
      const clientRequest = get(
        new URL("/api/attachments/attachment-1/download", serverUrl(server)),
        (response) => {
          response.once("data", () => {
            clientRequest.destroy();
            resolve();
          });
        },
      );
      clientRequest.once("error", reject);
    });
    source.write("partial");
    await responseReceived;
    await once(source, "close");

    assert.equal(source.destroyed, true);
  } finally {
    source.destroy();
    await close(server);
  }
});
