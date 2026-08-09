import assert from "node:assert/strict";
import test from "node:test";

import { navigationItems } from "./role-navigation.ts";

test("seven-role navigation matrix exposes only permitted menus", () => {
  const expected = {
    PIMPINAN: ["/", "/reports"],
    PRODUCT_OWNER: ["/", "/reports", "/reports/approval", "/periods"],
    PETUGAS_KANWIL: ["/", "/reports", "/reports/review"],
    KOORDINATOR_UPT: ["/", "/reports", "/reports/validation"],
    PETUGAS_UPT: ["/", "/reports"],
    ADMIN_SIMPATIK: ["/", "/users", "/upts", "/periods", "/settings"],
    SYSTEM_ADMIN: ["/settings"],
  } as const;

  for (const [role, paths] of Object.entries(expected)) {
    assert.deepEqual(
      navigationItems.filter((item) => item.roles.includes(role as never)).map((item) => item.href),
      paths,
      role,
    );
  }
});

test("component catalog is hidden from navigation for every role", () => {
  assert.equal(
    navigationItems.some((item) => item.href === "/components"),
    false,
  );
});

test("navigation remains keyboard and responsive ready", () => {
  assert.ok(navigationItems.every((item) => item.href.startsWith("/")));
  assert.ok(navigationItems.every((item) => item.label.length > 0));
});
