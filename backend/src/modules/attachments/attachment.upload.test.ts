import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { stat } from "node:fs/promises";
import { dirname } from "node:path";
import test from "node:test";

import express from "express";
import request from "supertest";

import { errorHandler } from "../../middleware/error-handler.js";
import {
  parseAttachmentUpload,
  UPLOAD_DIRECTORY,
  type ParsedAttachmentUpload,
} from "./attachment.upload.js";

async function listen(instance: express.Express): Promise<Server> {
  const server = createServer(instance);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

async function close(server: Server): Promise<void> {
  server.close();
  await once(server, "close");
}

test("attachment upload writes temporary files privately and cleans them up", async () => {
  const instance = express();
  let parsed: ParsedAttachmentUpload | undefined;
  instance.post("/upload", async (request, response, next) => {
    try {
      parsed = await parseAttachmentUpload(request, 1024 * 1024);
      response.json({ data: { filepath: parsed.file.filepath }, meta: {} });
    } catch (error) {
      next(error);
    }
  });
  instance.use(errorHandler);

  const server = await listen(instance);
  try {
    const buffer = Buffer.from("%PDF-upload-test");
    const response = await request(server)
      .post("/upload")
      .attach("file", buffer, { filename: "bukti.pdf", contentType: "application/pdf" });

    assert.equal(response.status, 200);
    assert.ok(parsed);

    const filepath = response.body.data.filepath as string;
    assert.equal(dirname(filepath), UPLOAD_DIRECTORY);

    const fileInfo = await stat(filepath);
    assert.equal(fileInfo.mode & 0o777, 0o600);
    const directoryInfo = await stat(UPLOAD_DIRECTORY);
    assert.equal(directoryInfo.mode & 0o777, 0o700);
    assert.equal(parsed.file.originalFilename, "bukti.pdf");
    assert.equal(parsed.file.mimetype, "application/pdf");
  } finally {
    await parsed?.cleanup();
    await close(server);
  }
});
