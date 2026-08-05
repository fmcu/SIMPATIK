import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";
import type { Role } from "@simpatik/contracts";

import type { AuthRequest } from "./auth.types.js";
import type { AuthSession } from "../modules/auth/auth.js";
import { errorHandler } from "./error-handler.js";
import { requireRole } from "./auth.js";
import { authorizationMatrix, rolesFor, type AuthorizationAction } from "./permissions.js";

const allRoles: Role[] = [
  "PIMPINAN",
  "PRODUCT_OWNER",
  "PETUGAS_KANWIL",
  "KOORDINATOR_UPT",
  "PETUGAS_UPT",
  "ADMIN_SIMPATIK",
  "SYSTEM_ADMIN",
];

function protectedApp(action: AuthorizationAction, role: Role) {
  const instance = express();
  instance.get(
    "/protected",
    (request, _response, next) => {
      (request as AuthRequest).auth = {
        session: {} as AuthSession,
        user: {
          id: "user-1",
          name: "Pengguna Uji",
          email: "uji@example.test",
          role,
          uptId: role === "PETUGAS_UPT" || role === "KOORDINATOR_UPT" ? "upt-a" : null,
          active: true,
        },
      };
      next();
    },
    requireRole(...rolesFor(action)),
    (_request, response) => response.json({ data: {}, meta: {} }),
  );
  instance.use(errorHandler);
  return instance;
}

test("authorization matrix covers every main endpoint action for all seven roles", async () => {
  const actions = Object.keys(authorizationMatrix) as AuthorizationAction[];
  assert.equal(actions.length, 21);

  for (const action of actions) {
    for (const role of allRoles) {
      const response = await request(protectedApp(action, role)).get("/protected");
      const allowed = rolesFor(action).includes(role);
      assert.equal(
        response.status,
        allowed ? 200 : 403,
        `${action} ${role} should be ${allowed ? "allowed" : "denied"}`,
      );
      if (!allowed) assert.equal(response.body.error.code, "ROLE_NOT_ALLOWED");
    }
  }
});

test("System Administrator is excluded from every business endpoint", () => {
  const deniedActions = Object.entries(authorizationMatrix)
    .filter(([, allowed]) => !(allowed as readonly Role[]).includes("SYSTEM_ADMIN"))
    .map(([action]) => action);

  assert.equal(deniedActions.length, Object.keys(authorizationMatrix).length);
});
