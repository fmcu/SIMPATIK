import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeAuditMetadata } from "./audit.service.js";

test("audit metadata removes sensitive values recursively", () => {
  const metadata = sanitizeAuditMetadata({
    status: "APPROVED",
    password: "hidden",
    nested: {
      accessToken: "hidden",
      cookie: "hidden",
      clientSecret: "hidden",
      fileContent: "hidden",
      size: 120,
    },
  });

  assert.deepEqual(metadata, {
    status: "APPROVED",
    nested: { size: 120 },
  });
});
