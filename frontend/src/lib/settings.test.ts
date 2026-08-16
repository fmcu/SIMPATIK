import assert from "node:assert/strict";
import test from "node:test";

import { healthStateFromResponse, settingsPanelForRole } from "./settings.ts";

test("settings assigns operational and technical panels to separate roles", () => {
  assert.equal(settingsPanelForRole("ADMIN_SIMPATIK"), "audit");
  assert.equal(settingsPanelForRole("SYSTEM_ADMIN"), "health");
  assert.equal(settingsPanelForRole("PRODUCT_OWNER"), "forbidden");
});

test("health liveness only describes the application process", () => {
  assert.deepEqual(healthStateFromResponse("live", 200, { data: { status: "ok" } }), {
    status: "available",
    label: "Aktif",
    description: "Proses aplikasi sedang berjalan.",
  });
});

test("health readiness describes the application, database, and private file storage", () => {
  assert.deepEqual(
    healthStateFromResponse("ready", 200, {
      data: { status: "ready", dependencies: { database: "ready", storage: "ready" } },
    }),
    {
      status: "available",
      label: "Siap",
      description: "Aplikasi, database, dan penyimpanan file privat siap melayani.",
    },
  );
});

test("health liveness requires a matching status body", () => {
  assert.deepEqual(healthStateFromResponse("live", 200, { data: { status: "weird" } }), {
    status: "unavailable",
    label: "Tidak aktif",
    description: "Respons server tidak valid.",
  });
  assert.deepEqual(healthStateFromResponse("live", 200, null), {
    status: "unavailable",
    label: "Tidak aktif",
    description: "Respons server tidak valid.",
  });
});

test("health readiness rejects a 200 body without ready dependencies", () => {
  assert.deepEqual(
    healthStateFromResponse("ready", 200, {
      data: { status: "ready", dependencies: { database: "ready", storage: "unavailable" } },
    }),
    {
      status: "unavailable",
      label: "Tidak siap",
      description: "Respons server tidak valid.",
    },
  );
});

test("health readiness treats HTTP 503 as not ready without throwing", () => {
  assert.deepEqual(
    healthStateFromResponse("ready", 503, {
      error: { code: "DATABASE_UNAVAILABLE", message: "Dependency database belum siap." },
    }),
    {
      status: "unavailable",
      label: "Tidak siap",
      description: "Dependency database belum siap.",
    },
  );
});
