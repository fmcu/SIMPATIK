import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import { createApp } from "../../app.js";

const database = {
  async $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
    void query;
    void values;
    return [];
  },
};

const app = createApp(database);

test("GET /health/live returns process health", async () => {
  const response = await request(app).get("/health/live");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { status: "ok" });
  assert.ok(response.headers["x-request-id"]);
});

test("GET /health/ready returns dependency health", async () => {
  const response = await request(app).get("/health/ready");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, {
    status: "ready",
    dependencies: { database: "ready" },
  });
});

test("GET /health/ready returns unavailable when database fails", async () => {
  const failingApp = createApp({
    async $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
      void query;
      void values;
      throw new Error("database unavailable");
    },
  });
  const response = await request(failingApp).get("/health/ready");

  assert.equal(response.status, 503);
  assert.deepEqual(response.body.error, {
    code: "DATABASE_UNAVAILABLE",
    message: "Dependency database belum siap.",
    fields: [],
  });
});

test("GET /missing returns standard not found error", async () => {
  const response = await request(app).get("/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
  assert.ok(Array.isArray(response.body.error.fields));
});
