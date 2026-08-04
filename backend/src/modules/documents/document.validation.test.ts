import assert from "node:assert/strict";
import test from "node:test";

import { findMissingRequiredDocuments } from "./document.validation.js";

test("required document validation returns only requirements without matching attachments", () => {
  const missing = findMissingRequiredDocuments(
    [
      { id: "requirement-1", code: "SK", name: "Surat keputusan" },
      { id: "requirement-2", code: "BA", name: "Berita acara" },
    ],
    ["requirement-1", "unrelated-requirement"],
  );

  assert.deepEqual(missing, [{ id: "requirement-2", code: "BA", name: "Berita acara" }]);
});

test("required document validation treats duplicate attachment IDs as one match", () => {
  const missing = findMissingRequiredDocuments(
    [{ id: "requirement-1", code: "SK", name: "Surat keputusan" }],
    ["requirement-1", "requirement-1"],
  );

  assert.deepEqual(missing, []);
});
