# Hide Component Catalog Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide `Katalog komponen` from desktop and mobile navigation for every role while retaining direct authenticated access to `/components`.

**Architecture:** Remove the `/components` entry from the shared `navigationItems` source consumed by both navigation variants. Keep the route and page unchanged. Lock behavior through the existing seven-role navigation matrix plus an explicit absence assertion.

**Tech Stack:** TypeScript, Node.js built-in test runner, Next.js 16, pnpm

## Global Constraints

- `/components` remains directly accessible to authenticated users.
- Do not add authorization checks, redirects, dependencies, or route changes.
- Do not modify `frontend/src/app/components/page.tsx`.

---

### Task 1: Remove Component Catalog From Navigation

**Files:**
- Modify: `frontend/src/lib/role-navigation.e2e.test.ts:6-29`
- Modify: `frontend/src/lib/role-navigation.ts:3-49`

**Interfaces:**
- Consumes: exported `navigationItems: readonly NavigationItem[]`.
- Produces: `navigationItems` without an item whose `href` is `/components`; the `/components` route itself remains unchanged.

- [ ] **Step 1: Write the failing navigation test**

Update the expected role paths and add the explicit absence test:

```ts
const expected = {
  PIMPINAN: ["/", "/reports"],
  PRODUCT_OWNER: ["/", "/reports", "/reports/approval", "/periods"],
  PETUGAS_KANWIL: ["/", "/reports", "/reports/review"],
  KOORDINATOR_UPT: ["/", "/reports", "/reports/validation"],
  PETUGAS_UPT: ["/", "/reports"],
  ADMIN_SIMPATIK: ["/", "/users", "/upts", "/periods", "/settings"],
  SYSTEM_ADMIN: ["/settings"],
} as const;
```

Add after the matrix test:

```ts
test("component catalog is hidden from navigation for every role", () => {
  assert.equal(
    navigationItems.some((item) => item.href === "/components"),
    false,
  );
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm --filter @simpatik/frontend test -- role-navigation.e2e.test.ts
```

Expected: FAIL because every current role still receives `/components`, and the explicit absence assertion receives `true`.

- [ ] **Step 3: Remove the shared menu item**

Delete the complete `Katalog komponen` object from `navigationItems` in `frontend/src/lib/role-navigation.ts`:

```ts
{
  label: "Katalog komponen",
  href: "/components",
  icon: "components",
  roles: [
    "PIMPINAN",
    "PRODUCT_OWNER",
    "PETUGAS_KANWIL",
    "KOORDINATOR_UPT",
    "PETUGAS_UPT",
    "ADMIN_SIMPATIK",
    "SYSTEM_ADMIN",
  ],
},
```

Remove the now-unused `"components"` member from `NavigationIcon`.

- [ ] **Step 4: Run the focused test and verify success**

Run:

```bash
pnpm --filter @simpatik/frontend test -- role-navigation.e2e.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run complete frontend verification**

Run:

```bash
pnpm --filter @simpatik/frontend test
pnpm --filter @simpatik/frontend lint
pnpm --filter @simpatik/frontend type-check
```

Expected: all commands exit successfully.

- [ ] **Step 6: Review scope**

Run:

```bash
git diff -- frontend/src/lib/role-navigation.ts frontend/src/lib/role-navigation.e2e.test.ts
```

Expected: only the menu item, unused icon union member, and test expectations/assertion changed. Do not commit unless explicitly requested.
