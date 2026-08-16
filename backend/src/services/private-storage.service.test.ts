import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  LocalPrivateStorageAdapter,
  S3PrivateStorageAdapter,
  StorageObjectNotFoundError,
  StorageUnavailableError,
  createPrivateStorageAdapter,
  isStorageObjectNotFoundError,
  isStorageUnavailableError,
  type S3ClientLike,
  type S3SendOptions,
  type S3StorageCommand,
  type StorageConfig,
} from "./private-storage.service.js";

const VALID_KEY = "attachments/550e8400-e29b-41d4-a716-446655440000";
const LEGACY_KEYS = [
  "attachments/legacykey",
  "attachments/LEGACYKEY",
  "attachments/legacy-key-123",
] as const;
const S3_CONFIG = {
  driver: "s3",
  bucket: "private-bucket",
  region: "us-east-1",
  forcePathStyle: false,
  keyPrefix: "objects",
} as const satisfies StorageConfig;

async function streamBytes(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

type CommandResponder = (
  command: S3StorageCommand,
  options: S3SendOptions | undefined,
) => unknown | Promise<unknown>;

class FakeS3Client implements S3ClientLike {
  readonly calls: Array<{ command: S3StorageCommand; options: S3SendOptions | undefined }> = [];
  destroyed = false;

  constructor(private readonly responder: CommandResponder = () => ({})) {}

  async send(command: S3StorageCommand, options?: S3SendOptions): Promise<unknown> {
    this.calls.push({ command, options });
    return this.responder(command, options);
  }

  destroy(): void {
    this.destroyed = true;
  }
}

function createSignalRecorder(): {
  timeouts: number[];
  factory: (timeoutMs: number) => AbortSignal;
} {
  const timeouts: number[] = [];
  return {
    timeouts,
    factory: (timeoutMs) => {
      timeouts.push(timeoutMs);
      return new AbortController().signal;
    },
  };
}

class TimeoutReadable extends Readable {
  timeoutMs: number | undefined;
  timeoutHandler: (() => void) | undefined;

  setTimeout(timeoutMs: number, callback?: () => void): this {
    this.timeoutMs = timeoutMs;
    this.timeoutHandler = callback;
    return this;
  }

  override _read(): void {}
}

test("local private storage probes, streams, and idempotently removes objects", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-storage-"));
  const rootDirectory = join(directory, "private");
  const source = join(directory, "source.pdf");
  await writeFile(source, "%PDF-test");
  const storage = new LocalPrivateStorageAdapter(rootDirectory);

  try {
    await storage.check();
    assert.equal((await stat(rootDirectory)).isDirectory(), true);
    assert.deepEqual(await readdir(rootDirectory), []);

    await storage.write(VALID_KEY, source);
    assert.equal((await streamBytes(await storage.read(VALID_KEY))).toString(), "%PDF-test");
    assert.deepEqual(await readdir(join(rootDirectory, "attachments")), [
      "550e8400-e29b-41d4-a716-446655440000",
    ]);

    await storage.delete(VALID_KEY);
    await storage.delete(VALID_KEY);
    await assert.rejects(
      () => storage.read(VALID_KEY),
      (error: unknown) => {
        assert.ok(error instanceof StorageObjectNotFoundError);
        assert.equal(error.message, "Private storage object was not found.");
        assert.equal(isStorageObjectNotFoundError(error), true);
        return true;
      },
    );
    assert.doesNotThrow(() => storage.close());
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("local check rejects a root path that is a file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-storage-"));
  const rootFile = join(directory, "not-a-directory");
  await writeFile(rootFile, "occupied");
  const storage = new LocalPrivateStorageAdapter(rootFile);

  try {
    await assert.rejects(() => storage.check(), StorageUnavailableError);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("local and S3 adapters reject unsafe or arbitrarily nested keys", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-storage-"));
  const source = join(directory, "source.pdf");
  await writeFile(source, "test");
  const fake = new FakeS3Client();
  const adapters = [
    new LocalPrivateStorageAdapter(join(directory, "private")),
    new S3PrivateStorageAdapter(S3_CONFIG, { s3Client: fake }),
  ];
  const invalidKeys = [
    "attachments/",
    "attachments/legacy_key",
    "attachments/legacy.key",
    "attachments/nested/key",
    "attachments/../secret",
    "attachments/../../etc/passwd",
    "attachments/legacy\nkey",
    "attachments/legacy\0key",
    `/attachments/550e8400-e29b-41d4-a716-446655440000`,
  ];

  try {
    for (const storage of adapters) {
      for (const key of invalidKeys) {
        await assert.rejects(() => storage.write(key, source), TypeError);
        await assert.rejects(() => storage.read(key), TypeError);
        await assert.rejects(() => storage.delete(key), TypeError);
      }
      storage.close();
    }
    assert.equal(fake.calls.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("local adapter reads and deletes persisted legacy attachment keys", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-storage-"));
  const rootDirectory = join(directory, "private");
  const storage = new LocalPrivateStorageAdapter(rootDirectory);

  try {
    for (const key of LEGACY_KEYS) {
      const target = join(rootDirectory, ...key.split("/"));
      await mkdir(join(rootDirectory, "attachments"), { recursive: true });
      await writeFile(target, key);

      assert.equal((await streamBytes(await storage.read(key))).toString(), key);
      await storage.delete(key);
      await assert.rejects(() => storage.read(key), StorageObjectNotFoundError);
    }
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("S3 adapter reads and deletes persisted legacy attachment keys", async () => {
  const fake = new FakeS3Client((command) => {
    if (command instanceof GetObjectCommand)
      return { Body: Readable.from([command.input.Key ?? ""]) };
    return {};
  });
  const storage = new S3PrivateStorageAdapter(S3_CONFIG, { s3Client: fake });

  for (const key of LEGACY_KEYS) {
    assert.equal((await streamBytes(await storage.read(key))).toString(), `objects/${key}`);
    await storage.delete(key);
  }

  assert.deepEqual(
    fake.calls.map(({ command }) => command.input.Key),
    LEGACY_KEYS.flatMap((key) => [`objects/${key}`, `objects/${key}`]),
  );
  storage.close();
});

test("S3 object operations use prefix, streams, and safe operation deadlines", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simpatik-storage-"));
  const source = join(directory, "source.pdf");
  const upload = Buffer.from("streamed upload");
  const download = Buffer.from("streamed download");
  await writeFile(source, upload);
  let uploadedBody: Buffer | undefined;

  const fake = new FakeS3Client(async (command) => {
    if (command instanceof PutObjectCommand) {
      assert.ok(command.input.Body instanceof Readable);
      uploadedBody = await streamBytes(command.input.Body);
      return {};
    }
    if (command instanceof GetObjectCommand) return { Body: Readable.from([download]) };
    return {};
  });
  const signals = createSignalRecorder();
  const storage = new S3PrivateStorageAdapter(
    {
      ...S3_CONFIG,
      region: "ap-southeast-2",
      endpoint: "http://127.0.0.1:9000",
      forcePathStyle: true,
      keyPrefix: "/tenant/private/",
    },
    { s3Client: fake, abortSignalTimeout: signals.factory },
  );

  try {
    await storage.write(VALID_KEY, source);
    assert.deepEqual(uploadedBody, upload);
    assert.equal(
      (await streamBytes(await storage.read(VALID_KEY))).toString(),
      download.toString(),
    );
    await storage.delete(VALID_KEY);

    assert.deepEqual(
      fake.calls.map(({ command }) => command.constructor.name),
      ["PutObjectCommand", "GetObjectCommand", "DeleteObjectCommand"],
    );
    assert.deepEqual(signals.timeouts, [30_000]);
    assert.deepEqual(fake.calls[0]?.options, { requestTimeout: 0 });
    assert.equal(fake.calls[1]?.options, undefined);
    assert.ok(fake.calls[2]?.options?.abortSignal instanceof AbortSignal);

    const put = fake.calls[0]?.command;
    assert.ok(put instanceof PutObjectCommand);
    assert.deepEqual(put.input, {
      Bucket: "private-bucket",
      Key: `tenant/private/${VALID_KEY}`,
      Body: put.input.Body,
      ContentLength: upload.length,
    });
    assert.equal("ACL" in put.input, false);

    const get = fake.calls[1]?.command;
    assert.ok(get instanceof GetObjectCommand);
    assert.deepEqual(get.input, {
      Bucket: "private-bucket",
      Key: `tenant/private/${VALID_KEY}`,
    });

    const deletion = fake.calls[2]?.command;
    assert.ok(deletion instanceof DeleteObjectCommand);
    assert.deepEqual(deletion.input, {
      Bucket: "private-bucket",
      Key: `tenant/private/${VALID_KEY}`,
    });
  } finally {
    storage.close();
    assert.equal(fake.destroyed, true);
    await rm(directory, { recursive: true, force: true });
  }
});

test("S3 deep check performs prefixed Put/Get/Delete, cleans body, and caches success", async () => {
  let probeBody: Readable | undefined;
  const fake = new FakeS3Client((command) => {
    if (command instanceof GetObjectCommand) {
      probeBody = Readable.from(["ok"]);
      return { Body: probeBody };
    }
    return {};
  });
  const signals = createSignalRecorder();
  const storage = new S3PrivateStorageAdapter(S3_CONFIG, {
    s3Client: fake,
    abortSignalTimeout: signals.factory,
  });

  await storage.check();
  await storage.check();

  assert.deepEqual(
    fake.calls.map(({ command }) => command.constructor.name),
    ["PutObjectCommand", "GetObjectCommand", "DeleteObjectCommand"],
  );
  assert.deepEqual(signals.timeouts, [5_000, 5_000, 5_000]);
  assert.equal(probeBody?.destroyed, true);

  const commands = fake.calls.map(({ command }) => command);
  const put = commands[0];
  const get = commands[1];
  const deletion = commands[2];
  assert.ok(put instanceof PutObjectCommand);
  assert.ok(get instanceof GetObjectCommand);
  assert.ok(deletion instanceof DeleteObjectCommand);
  assert.match(put.input.Key ?? "", /^objects\/\.simpatik-storage-check\/[0-9a-f-]+$/);
  assert.equal(get.input.Key, put.input.Key);
  assert.equal(deletion.input.Key, put.input.Key);
  assert.deepEqual(put.input.Body, Buffer.from("ok"));
  assert.equal("ACL" in put.input, false);
  storage.close();
});

test("S3 check deduplicates concurrent probes", async () => {
  let releasePut: (() => void) | undefined;
  const putBlocked = new Promise<void>((resolve) => {
    releasePut = resolve;
  });
  const fake = new FakeS3Client(async (command) => {
    if (command instanceof PutObjectCommand) await putBlocked;
    if (command instanceof GetObjectCommand) return { Body: Readable.from(["ok"]) };
    return {};
  });
  const storage = new S3PrivateStorageAdapter(S3_CONFIG, { s3Client: fake });

  const first = storage.check();
  const second = storage.check();
  assert.equal(fake.calls.length, 1);
  releasePut?.();
  await Promise.all([first, second]);
  assert.equal(fake.calls.length, 3);
  storage.close();
});

test("S3 check deletes its probe and sanitizes Get failures", async () => {
  const fake = new FakeS3Client((command) => {
    if (command instanceof GetObjectCommand) {
      throw new Error("provider host and credentials must not leak");
    }
    return {};
  });
  const storage = new S3PrivateStorageAdapter(S3_CONFIG, { s3Client: fake });

  await assert.rejects(
    () => storage.check(),
    (error: unknown) => {
      assert.ok(error instanceof StorageUnavailableError);
      assert.equal(error.message, "Private storage is unavailable.");
      assert.equal(error.message.includes("provider host"), false);
      return true;
    },
  );
  assert.deepEqual(
    fake.calls.map(({ command }) => command.constructor.name),
    ["PutObjectCommand", "GetObjectCommand", "DeleteObjectCommand"],
  );
  const get = fake.calls[1]?.command;
  const deletion = fake.calls[2]?.command;
  assert.ok(get instanceof GetObjectCommand);
  assert.ok(deletion instanceof DeleteObjectCommand);
  assert.equal(deletion.input.Key, get.input.Key);
  storage.close();
});

test("S3 check treats probe cleanup failure as unavailable and does not cache it", async () => {
  let deleteAttempts = 0;
  const fake = new FakeS3Client((command) => {
    if (command instanceof GetObjectCommand) return { Body: Readable.from(["ok"]) };
    if (command instanceof DeleteObjectCommand) {
      deleteAttempts += 1;
      if (deleteAttempts === 1) throw new Error("delete denied");
    }
    return {};
  });
  const storage = new S3PrivateStorageAdapter(S3_CONFIG, { s3Client: fake });

  await assert.rejects(() => storage.check(), StorageUnavailableError);
  await storage.check();
  assert.deepEqual(
    fake.calls.map(({ command }) => command.constructor.name),
    [
      "PutObjectCommand",
      "GetObjectCommand",
      "DeleteObjectCommand",
      "PutObjectCommand",
      "GetObjectCommand",
      "DeleteObjectCommand",
    ],
  );
  storage.close();
});

test("S3 check destroys a failing Get body and still deletes its probe", async () => {
  const brokenBody = new Readable({
    read() {
      this.destroy(new Error("body failure"));
    },
  });
  const fake = new FakeS3Client((command) => {
    if (command instanceof GetObjectCommand) return { Body: brokenBody };
    return {};
  });
  const storage = new S3PrivateStorageAdapter(S3_CONFIG, { s3Client: fake });

  await assert.rejects(() => storage.check(), StorageUnavailableError);
  assert.equal(brokenBody.destroyed, true);
  assert.ok(fake.calls[2]?.command instanceof DeleteObjectCommand);
  storage.close();
});

test("S3 Get applies an inactivity timeout without an absolute abort deadline", async () => {
  const body = new TimeoutReadable();
  const fake = new FakeS3Client(() => ({ Body: body }));
  const signals = createSignalRecorder();
  const storage = new S3PrivateStorageAdapter(S3_CONFIG, {
    s3Client: fake,
    abortSignalTimeout: signals.factory,
  });

  const returned = await storage.read(VALID_KEY);
  assert.equal(returned, body);
  assert.equal(body.timeoutMs, 30_000);
  assert.equal(fake.calls[0]?.options, undefined);
  assert.deepEqual(signals.timeouts, []);

  const emittedError = new Promise<Error>((resolve) => body.once("error", resolve));
  body.timeoutHandler?.();
  assert.ok((await emittedError) instanceof StorageUnavailableError);
  assert.equal(body.destroyed, true);
  assert.ok(body.errored instanceof StorageUnavailableError);
  storage.close();
});

test("S3 Get maps NoSuchKey error shapes to object not found", async () => {
  const missingKeyErrors = [
    Object.assign(new Error("missing by name"), {
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    }),
    Object.assign(new Error("missing by code"), {
      code: "NoSuchKey",
      statusCode: 404,
    }),
    { Code: "NoSuchKey", message: "missing by provider Code" },
  ];
  let attempt = 0;
  const fake = new FakeS3Client(() => {
    throw missingKeyErrors[attempt++];
  });
  const storage = new S3PrivateStorageAdapter(S3_CONFIG, { s3Client: fake });

  for (const providerError of missingKeyErrors) {
    await assert.rejects(
      () => storage.read(VALID_KEY),
      (error: unknown) => {
        assert.ok(error instanceof StorageObjectNotFoundError);
        assert.equal(error.message, "Private storage object was not found.");
        assert.equal(error.message.includes(String(providerError.message)), false);
        return true;
      },
    );
  }
  storage.close();
});

test("S3 Get treats NoSuchBucket and non-semantic 404 errors as unavailable", async () => {
  const providerErrors = [
    Object.assign(new Error("wrong bucket"), {
      name: "NoSuchBucket",
      $metadata: { httpStatusCode: 404 },
    }),
    Object.assign(new Error("proxy route missing"), {
      name: "NotFound",
      $metadata: { httpStatusCode: 404 },
    }),
    Object.assign(new Error("generic endpoint 404"), {
      statusCode: 404,
    }),
    Object.assign(new Error("metadata-only endpoint 404"), {
      $metadata: { httpStatusCode: 404 },
    }),
  ];

  for (const providerError of providerErrors) {
    const storage = new S3PrivateStorageAdapter(S3_CONFIG, {
      s3Client: new FakeS3Client(() => {
        throw providerError;
      }),
    });
    await assert.rejects(() => storage.read(VALID_KEY), StorageUnavailableError);
    storage.close();
  }
});

test("S3 Delete treats every provider error, including 404 shapes, as unavailable", async () => {
  const providerErrors = [
    Object.assign(new Error("object-shaped error on idempotent delete"), {
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    }),
    Object.assign(new Error("wrong bucket"), {
      code: "NoSuchBucket",
      statusCode: 404,
    }),
    Object.assign(new Error("proxy route missing"), {
      name: "NotFound",
      $metadata: { httpStatusCode: 404 },
    }),
    { statusCode: 404, message: "generic endpoint 404" },
  ];

  for (const providerError of providerErrors) {
    const storage = new S3PrivateStorageAdapter(S3_CONFIG, {
      s3Client: new FakeS3Client(() => {
        throw providerError;
      }),
    });
    await assert.rejects(() => storage.delete(VALID_KEY), StorageUnavailableError);
    storage.close();
  }
});

test("S3 adapter cleans upload streams and sanitizes provider outages", async () => {
  const missingBodyStorage = new S3PrivateStorageAdapter(S3_CONFIG, {
    s3Client: new FakeS3Client(() => ({})),
  });
  await assert.rejects(() => missingBodyStorage.read(VALID_KEY), StorageUnavailableError);
  missingBodyStorage.close();

  const directory = await mkdtemp(join(tmpdir(), "simpatik-storage-"));
  const source = join(directory, "source.pdf");
  await writeFile(source, "stream cleanup");
  let putBody: Readable | undefined;
  const outage = new FakeS3Client((command) => {
    if (command instanceof PutObjectCommand && command.input.Body instanceof Readable) {
      putBody = command.input.Body;
    }
    throw new Error("provider host and credentials must not leak");
  });
  const storage = new S3PrivateStorageAdapter(S3_CONFIG, { s3Client: outage });

  try {
    const expectUnavailable = async (operation: () => Promise<unknown>) => {
      await assert.rejects(operation, (error: unknown) => {
        assert.ok(error instanceof StorageUnavailableError);
        assert.equal(error.message, "Private storage is unavailable.");
        assert.equal(error.message.includes("provider host"), false);
        assert.equal(isStorageUnavailableError(error), true);
        return true;
      });
    };

    await expectUnavailable(() => storage.write(VALID_KEY, source));
    assert.equal(putBody?.destroyed, true);
    await expectUnavailable(() => storage.read(VALID_KEY));
    await expectUnavailable(() => storage.delete(VALID_KEY));
  } finally {
    storage.close();
    assert.equal(outage.destroyed, true);
    await rm(directory, { recursive: true, force: true });
  }
});

test("factory accepts canonical configs and configures bounded Node HTTP timeouts", async () => {
  const localConfig: StorageConfig = {
    driver: "local",
    rootDirectory: "/tmp/simpatik-private-storage-test",
  };
  const local = createPrivateStorageAdapter(localConfig);
  assert.ok(local instanceof LocalPrivateStorageAdapter);
  local.close();

  const fake = new FakeS3Client();
  let capturedConfig:
    | Parameters<
        NonNullable<
          NonNullable<Parameters<typeof createPrivateStorageAdapter>[1]>["s3ClientFactory"]
        >
      >[0]
    | undefined;
  const s3 = createPrivateStorageAdapter(S3_CONFIG, {
    s3ClientFactory: (config) => {
      capturedConfig = config;
      return fake;
    },
  });
  assert.ok(s3 instanceof S3PrivateStorageAdapter);
  assert.equal(capturedConfig?.region, "us-east-1");
  assert.equal(capturedConfig?.forcePathStyle, false);
  assert.ok(capturedConfig?.requestHandler instanceof NodeHttpHandler);
  const handler = capturedConfig.requestHandler;
  await handler
    .handle(
      {
        protocol: "unsupported:",
        hostname: "unused",
        method: "GET",
        path: "/",
        headers: {},
        clone() {
          return this;
        },
      } as Parameters<NodeHttpHandler["handle"]>[0],
      { abortSignal: AbortSignal.abort() },
    )
    .catch(() => undefined);
  const handlerConfig = handler.httpHandlerConfigs();
  assert.equal(handlerConfig.connectionTimeout, 5_000);
  assert.equal(handlerConfig.requestTimeout, undefined);
  assert.equal(handlerConfig.socketTimeout, 30_000);
  assert.equal(handlerConfig.throwOnRequestTimeout, undefined);
  assert.equal("credentials" in capturedConfig, false);
  s3.close();
  assert.equal(fake.destroyed, true);
});
