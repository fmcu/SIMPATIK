import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { LocalPrivateStorageAdapter } from "./private-storage.service.js";

test("local private storage persists and removes files by non-guessable storage key", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-storage-"));
  const source = join(directory, "source.pdf");
  await writeFile(source, "%PDF-test");
  const storage = new LocalPrivateStorageAdapter(join(directory, "private"));

  try {
    await storage.write("attachments/550e8400-e29b-41d4-a716-446655440000", source);
    const stream = await storage.read("attachments/550e8400-e29b-41d4-a716-446655440000");
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    assert.equal(Buffer.concat(chunks).toString(), "%PDF-test");

    await storage.delete("attachments/550e8400-e29b-41d4-a716-446655440000");
    await assert.rejects(() => storage.read("attachments/550e8400-e29b-41d4-a716-446655440000"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("local private storage rejects path traversal keys", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-storage-"));
  const storage = new LocalPrivateStorageAdapter(directory);

  try {
    await assert.rejects(() => storage.read("attachments/../../etc/passwd"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
