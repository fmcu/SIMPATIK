import assert from "node:assert/strict";
import test from "node:test";

import express, { type RequestHandler } from "express";
import request from "supertest";

import { AppError } from "../../middleware/error.js";
import { errorHandler } from "../../middleware/error-handler.js";
import { createApp } from "../../app.js";
import { createHealthRouter } from "./health.routes.js";

const database = {
  async $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
    void query;
    void values;
    return [];
  },
};

const storage = {
  async write(): Promise<void> {},
  async read(): Promise<never> {
    throw new Error("not used");
  },
  async delete(): Promise<void> {},
  async check(): Promise<void> {},
  close(): void {},
};

const passSession: RequestHandler = (_request, _response, next) => next();

const app = createApp({ database, storage });
const protectedApp = createApp({
  database,
  storage,
  healthRequireSession: passSession,
});

test("GET /health/live returns process health", async () => {
  const response = await request(protectedApp).get("/health/live");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { status: "ok" });
  assert.ok(response.headers["x-request-id"]);
});

test("GET /health/ready returns dependency health", async () => {
  const response = await request(protectedApp).get("/health/ready");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, {
    status: "ready",
    dependencies: { database: "ready", storage: "ready" },
  });
});

test("GET /health/ready returns unavailable when database fails", async () => {
  const failingApp = createApp({
    database: {
      async $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
        void query;
        void values;
        throw new Error("database unavailable");
      },
    },
    storage,
    healthRequireSession: passSession,
  });
  const response = await request(failingApp).get("/health/ready");

  assert.equal(response.status, 503);
  assert.deepEqual(response.body.error, {
    code: "DATABASE_UNAVAILABLE",
    message: "Dependency database belum siap.",
    fields: [],
  });
});

test("GET /health/ready returns unavailable when storage fails", async () => {
  const failingApp = createApp({
    database,
    storage: {
      ...storage,
      async check(): Promise<void> {
        throw new Error("storage unavailable");
      },
    },
    healthRequireSession: passSession,
  });
  const response = await request(failingApp).get("/health/ready");

  assert.equal(response.status, 503);
  assert.deepEqual(response.body.error, {
    code: "STORAGE_UNAVAILABLE",
    message: "Penyimpanan file privat belum siap.",
    fields: [],
  });
});

test("health endpoints reject anonymous requests", async () => {
  const response = await request(app).get("/health/live");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "AUTHENTICATION_REQUIRED");
});

test("health endpoints accept requests with a session", async () => {
  const response = await request(protectedApp).get("/health/live");
  assert.equal(response.status, 200);
});

test("health readiness deadline returns a dependency timeout error", async () => {
  const staleDatabase = {
    async $queryRaw(): Promise<unknown[]> {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return [];
    },
  };
  const routerApp = express();
  routerApp.use(
    "/health",
    createHealthRouter({
      database: staleDatabase,
      storage,
      requireSession: passSession,
      deadlineMs: 20,
    }),
  );
  routerApp.use(errorHandler);
  const response = await request(routerApp).get("/health/ready");

  assert.equal(response.status, 503);
  assert.deepEqual(response.body.error, {
    code: "DEPENDENCY_TIMEOUT",
    message: "Pemeriksaan dependensi melebihi batas waktu.",
    fields: [],
  });
});

test("health readiness propagates AppError reasons from dependencies", async () => {
  const failingStorage = {
    ...storage,
    async check(): Promise<void> {
      throw new AppError(503, "STORAGE_UNAVAILABLE", "Penyimpanan file privat belum siap.");
    },
  };
  const routerApp = express();
  routerApp.use(
    "/health",
    createHealthRouter({
      database,
      storage: failingStorage,
      requireSession: passSession,
    }),
  );
  routerApp.use(errorHandler);
  const response = await request(routerApp).get("/health/ready");

  assert.equal(response.status, 503);
  assert.deepEqual(response.body.error, {
    code: "STORAGE_UNAVAILABLE",
    message: "Penyimpanan file privat belum siap.",
    fields: [],
  });
});

test("GET /missing returns standard not found error", async () => {
  const response = await request(app).get("/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
  assert.ok(Array.isArray(response.body.error.fields));
});
