import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import { createApp } from "../../app.js";

const app = createApp();

test("Better Auth handler is mounted on the Express 5 splat route", async () => {
  const response = await request(app).get("/api/auth/ok");

  assert.equal(response.status, 200);
});

test("public email sign-up is disabled", async () => {
  const response = await request(app).post("/api/auth/sign-up/email").send({
    name: "Pendaftar Publik",
    email: "public@example.test",
    password: "password123",
  });

  assert.equal(response.status, 404);
});
