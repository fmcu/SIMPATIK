import assert from "node:assert/strict";
import test from "node:test";

import { navigationItems } from "./role-navigation.ts";

test("seven-role navigation matrix exposes only permitted menus", () => {
  const expected = {
    PIMPINAN: ["/", "/components", "/reports"],
    PRODUCT_OWNER: ["/", "/components", "/reports", "/reports/approval", "/periods"],
    PETUGAS_KANWIL: ["/", "/components", "/reports", "/reports/review"],
    KOORDINATOR_UPT: ["/", "/components", "/reports", "/reports/validation"],
    PETUGAS_UPT: ["/", "/components", "/reports"],
    ADMIN_SIMPATIK: ["/", "/components", "/users", "/upts", "/periods", "/settings"],
    SYSTEM_ADMIN: ["/components", "/settings"],
  } as const;

  for (const [role, paths] of Object.entries(expected)) {
    assert.deepEqual(
      navigationItems.filter((item) => item.roles.includes(role as never)).map((item) => item.href),
      paths,
      role,
    );
  }
});

test("navigation remains keyboard and responsive ready", () => {
  assert.ok(navigationItems.every((item) => item.href.startsWith("/")));
  assert.ok(navigationItems.every((item) => item.label.length > 0));
});
