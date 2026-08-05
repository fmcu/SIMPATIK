import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";

import { createApp } from "../app.js";
import { errorHandler } from "../middleware/error-handler.js";

const database = {
  async $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
    void query;
    void values;
    return [];
  },
};

test("security headers and CORS allowlist are applied", async () => {
  const app = createApp(database);
  const allowed = await request(app).get("/health/live").set("Origin", "http://localhost:3000");
  const denied = await request(app).get("/health/live").set("Origin", "http://untrusted.example");

  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:3000");
  assert.equal(allowed.headers["access-control-allow-credentials"], "true");
  assert.equal(allowed.headers["x-content-type-options"], "nosniff");
  assert.equal(allowed.headers["x-frame-options"], "DENY");
  assert.equal(allowed.headers["referrer-policy"], "no-referrer");
  assert.equal(allowed.headers["cache-control"], "no-store");
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, "FORBIDDEN");
});

test("request size limit returns a sanitized 413 response", async () => {
  const app = createApp(database);
  const response = await request(app)
    .post("/api/unknown")
    .set("Content-Type", "application/json")
    .set("Content-Length", "2000000")
    .send({ request: "too large" });

  assert.equal(response.status, 413);
  assert.equal(response.body.error.code, "REQUEST_TOO_LARGE");
  assert.doesNotMatch(JSON.stringify(response.body), /stack|Prisma|DATABASE_URL|node_modules/i);
});

test("malformed JSON returns a sanitized validation error", async () => {
  const app = createApp(database);
  const response = await request(app)
    .post("/api/unknown")
    .set("Content-Type", "application/json")
    .send('{"broken":');

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.equal(response.body.error.message, "Format JSON tidak valid.");
});

test("unknown errors expose only the public error contract", async () => {
  const app = express();
  app.get("/failure", () => {
    throw new Error("secret database path /srv/app/node_modules/prisma");
  });
  app.use(errorHandler);

  const response = await request(app).get("/failure");

  assert.equal(response.status, 500);
  assert.deepEqual(response.body.error, {
    code: "INTERNAL_ERROR",
    message: "Terjadi kesalahan internal.",
    fields: [],
  });
  assert.doesNotMatch(JSON.stringify(response.body), /secret|stack|Prisma|node_modules/i);
});
