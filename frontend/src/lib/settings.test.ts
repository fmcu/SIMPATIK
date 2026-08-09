import assert from "node:assert/strict";
import test from "node:test";

import { healthStateFromResponse, settingsPanelForRole } from "./settings.ts";

test("settings assigns operational and technical panels to separate roles", () => {
  assert.equal(settingsPanelForRole("ADMIN_SIMPATIK"), "audit");
  assert.equal(settingsPanelForRole("SYSTEM_ADMIN"), "health");
  assert.equal(settingsPanelForRole("PRODUCT_OWNER"), "forbidden");
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
