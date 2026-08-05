import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("accessibility and responsive QA contracts remain present", () => {
  const dialog = source("../components/ui/dialog.tsx");
  const sheet = source("../components/ui/sheet.tsx");
  const shell = source("../components/shared/app-shell.tsx");
  const table = source("../components/shared/data-table.tsx");
  const tablePrimitive = source("../components/ui/table.tsx");
  const form = source("../components/shared/form-field.tsx");

  assert.match(dialog, /aria-modal=\"true\"/);
  assert.match(dialog, /aria-labelledby=\{titleId\}/);
  assert.match(dialog, /event\.key !== \"Tab\"/);
  assert.match(sheet, /aria-modal=\"true\"/);
  assert.match(sheet, /event\.key !== \"Tab\"/);
  assert.match(shell, /focus-visible:outline/);
  assert.match(shell, /aria-label=\"Buka navigasi\"/);
  assert.match(shell, /sm:hidden/);
  assert.match(table, /caption className=\"sr-only\"/);
  assert.match(tablePrimitive, /overflow-auto/);
  assert.match(form, /htmlFor=\{id\}/);
  assert.match(form, /aria-hidden=\"true\"/);
});
