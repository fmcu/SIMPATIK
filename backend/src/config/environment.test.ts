import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "./environment.js";

const productionSource = {
  NODE_ENV: "production",
  PORT: "4000",
  WEB_URL: "https://simpatik.example.go.id",
  API_URL: "https://simpatik.example.go.id/api",
  DATABASE_URL: "postgresql://app:strong-password@db.internal:5432/simpatik",
  BETTER_AUTH_URL: "https://simpatik.example.go.id/api",
  BETTER_AUTH_SECRET: "12345678901234567890123456789012",
  TRUSTED_ORIGINS: "https://simpatik.example.go.id",
  STORAGE_DRIVER: "local",
  STORAGE_BUCKET: "/var/lib/simpatik/storage",
  MAX_UPLOAD_SIZE: "10485760",
};

test("production environment requires explicit secure origins", () => {
  assert.throws(() =>
    loadEnvironment({
      ...productionSource,
      TRUSTED_ORIGINS: "http://simpatik.example.go.id",
    }),
  );
  assert.throws(() =>
    loadEnvironment({
      ...productionSource,
      WEB_URL: "https://simpatik.example.go.id",
      TRUSTED_ORIGINS: "https://other.example.go.id",
    }),
  );
});

test("production environment rejects default database credentials", () => {
  assert.throws(() =>
    loadEnvironment({
      ...productionSource,
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/simpatik",
    }),
  );
});
