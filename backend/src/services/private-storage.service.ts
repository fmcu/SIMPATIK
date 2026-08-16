import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler, type NodeHttpHandlerOptions } from "@smithy/node-http-handler";
import { constants as fsConstants, createReadStream } from "node:fs";
import { copyFile, mkdir, open, rename, rm, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";

const STORAGE_KEY_PATTERN = /^attachments\/[a-z0-9-]+$/i;
const LOCAL_CHECK_PROBE_PREFIX = ".simpatik-storage-check-";
const S3_CHECK_PROBE_PREFIX = ".simpatik-storage-check/";
const S3_CHECK_PROBE_BYTES = Buffer.from("ok");
const S3_CHECK_CACHE_TTL_MS = 5_000;
const S3_READINESS_TIMEOUT_MS = 5_000;
const S3_OBJECT_OPERATION_TIMEOUT_MS = 30_000;
const S3_HTTP_HANDLER_OPTIONS: Readonly<NodeHttpHandlerOptions> = {
  connectionTimeout: 5_000,
  socketTimeout: 30_000,
};

export class StorageObjectNotFoundError extends Error {
  readonly code = "STORAGE_OBJECT_NOT_FOUND";

  constructor() {
    super("Private storage object was not found.");
    this.name = "StorageObjectNotFoundError";
  }
}

export class StorageUnavailableError extends Error {
  readonly code = "STORAGE_UNAVAILABLE";

  constructor() {
    super("Private storage is unavailable.");
    this.name = "StorageUnavailableError";
  }
}

export function isStorageObjectNotFoundError(error: unknown): error is StorageObjectNotFoundError {
  return error instanceof StorageObjectNotFoundError;
}

export function isStorageUnavailableError(error: unknown): error is StorageUnavailableError {
  return error instanceof StorageUnavailableError;
}

export interface PrivateStorageAdapter {
  write(storageKey: string, sourcePath: string): Promise<void>;
  read(storageKey: string): Promise<Readable>;
  delete(storageKey: string): Promise<void>;
}

export interface ManagedPrivateStorageAdapter extends PrivateStorageAdapter {
  check(): Promise<void>;
  close(): void;
}

export type LocalPrivateStorageConfig = {
  driver: "local";
  rootDirectory: string;
};

export type S3PrivateStorageConfig = {
  driver: "s3";
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  keyPrefix: string;
};

export type StorageConfig = LocalPrivateStorageConfig | S3PrivateStorageConfig;

export type S3StorageCommand = PutObjectCommand | GetObjectCommand | DeleteObjectCommand;

export type S3SendOptions = {
  abortSignal?: AbortSignal;
  requestTimeout?: number;
};

export interface S3ClientLike {
  send(command: S3StorageCommand, options?: S3SendOptions): Promise<unknown>;
  destroy(): void;
}

export type S3ClientFactory = (config: S3ClientConfig) => S3ClientLike;

export interface PrivateStorageFactoryDependencies {
  s3Client?: S3ClientLike;
  s3ClientFactory?: S3ClientFactory;
  abortSignalTimeout?: (timeoutMs: number) => AbortSignal;
}

function assertStorageKey(storageKey: string): void {
  if (STORAGE_KEY_PATTERN.exec(storageKey)?.[0] !== storageKey) {
    throw new TypeError("Invalid private storage key.");
  }
}

function localPath(rootDirectory: string, storageKey: string): string {
  assertStorageKey(storageKey);

  const target = resolve(rootDirectory, storageKey);
  const relativeTarget = relative(rootDirectory, target);
  if (relativeTarget === ".." || relativeTarget.startsWith(`..${sep}`)) {
    throw new TypeError("Invalid private storage key.");
  }
  return target;
}

function errorCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) return undefined;
  return (error as { code?: unknown }).code;
}

function isFileNotFoundError(error: unknown): boolean {
  return errorCode(error) === "ENOENT";
}

function isS3ObjectNotFoundError(error: unknown): boolean {
  if (error instanceof StorageObjectNotFoundError) return true;
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as {
    name?: unknown;
    code?: unknown;
    Code?: unknown;
  };
  return (
    candidate.name === "NoSuchKey" ||
    candidate.code === "NoSuchKey" ||
    candidate.Code === "NoSuchKey"
  );
}

function normalizeKeyPrefix(keyPrefix: string | undefined): string {
  return (keyPrefix ?? "").replace(/^\/+|\/+$/g, "");
}

function destroyBody(body: unknown): void {
  if (typeof (body as { destroy?: unknown } | null)?.destroy === "function") {
    (body as { destroy(): void }).destroy();
  }
}

function setBodyInactivityTimeout(body: Readable): void {
  const setTimeout = (body as Readable & { setTimeout?: unknown }).setTimeout;
  if (typeof setTimeout !== "function") return;

  setTimeout.call(body, S3_OBJECT_OPERATION_TIMEOUT_MS, () => {
    body.destroy(new StorageUnavailableError());
  });
}

async function consumeBody(body: unknown): Promise<Buffer> {
  if (!(body instanceof Readable)) throw new StorageUnavailableError();

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  } finally {
    body.destroy();
  }
}

export class LocalPrivateStorageAdapter implements ManagedPrivateStorageAdapter {
  private readonly rootDirectory: string;

  constructor(rootDirectory: string) {
    this.rootDirectory = resolve(rootDirectory);
  }

  async write(storageKey: string, sourcePath: string): Promise<void> {
    const target = localPath(this.rootDirectory, storageKey);
    const targetDirectory = dirname(target);
    const temporaryPath = resolve(targetDirectory, `.${randomUUID()}.tmp`);

    try {
      await mkdir(targetDirectory, { recursive: true });
      await copyFile(sourcePath, temporaryPath, fsConstants.COPYFILE_EXCL);
      await rename(temporaryPath, target);
    } catch {
      throw new StorageUnavailableError();
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  }

  async read(storageKey: string): Promise<Readable> {
    const target = localPath(this.rootDirectory, storageKey);
    try {
      const file = await open(target, "r");
      try {
        return file.createReadStream();
      } catch (error) {
        await file.close();
        throw error;
      }
    } catch (error) {
      if (isFileNotFoundError(error)) throw new StorageObjectNotFoundError();
      throw new StorageUnavailableError();
    }
  }

  async delete(storageKey: string): Promise<void> {
    const target = localPath(this.rootDirectory, storageKey);
    try {
      await rm(target, { force: true });
    } catch {
      throw new StorageUnavailableError();
    }
  }

  async check(): Promise<void> {
    const probePath = resolve(this.rootDirectory, `${LOCAL_CHECK_PROBE_PREFIX}${randomUUID()}`);
    let probeCreated = false;

    try {
      await mkdir(this.rootDirectory, { recursive: true });
      if (!(await stat(this.rootDirectory)).isDirectory())
        throw new Error("Storage root is not a directory.");

      const probe = await open(probePath, "wx", 0o600);
      probeCreated = true;
      await probe.close();
      await rm(probePath);
      probeCreated = false;
    } catch {
      if (probeCreated) await rm(probePath, { force: true }).catch(() => undefined);
      throw new StorageUnavailableError();
    }
  }

  close(): void {}
}

export class S3PrivateStorageAdapter implements ManagedPrivateStorageAdapter {
  private readonly bucket: string;
  private readonly client: S3ClientLike;
  private readonly keyPrefix: string;
  private readonly abortSignalTimeout: (timeoutMs: number) => AbortSignal;
  private successfulCheckExpiresAt = 0;
  private checkInFlight: Promise<void> | undefined;

  constructor(
    options: S3PrivateStorageConfig,
    dependencies: PrivateStorageFactoryDependencies = {},
  ) {
    this.bucket = options.bucket;
    this.keyPrefix = normalizeKeyPrefix(options.keyPrefix);
    this.abortSignalTimeout = dependencies.abortSignalTimeout ?? AbortSignal.timeout;

    const endpointConfig =
      options.endpoint === undefined
        ? {}
        : {
            endpoint: options.endpoint,
            requestChecksumCalculation: "WHEN_REQUIRED" as const,
            responseChecksumValidation: "WHEN_REQUIRED" as const,
          };
    const clientConfig: S3ClientConfig = {
      region: options.region,
      forcePathStyle: options.forcePathStyle,
      requestHandler: new NodeHttpHandler(S3_HTTP_HANDLER_OPTIONS),
      ...endpointConfig,
    };
    this.client =
      dependencies.s3Client ??
      dependencies.s3ClientFactory?.(clientConfig) ??
      (new S3Client(clientConfig) as S3ClientLike);
  }

  private physicalKey(storageKey: string): string {
    assertStorageKey(storageKey);
    return this.prefixedKey(storageKey);
  }

  private prefixedKey(key: string): string {
    return this.keyPrefix === "" ? key : `${this.keyPrefix}/${key}`;
  }

  private async send(command: S3StorageCommand, timeoutMs: number): Promise<unknown> {
    return this.client.send(command, { abortSignal: this.abortSignalTimeout(timeoutMs) });
  }

  async write(storageKey: string, sourcePath: string): Promise<void> {
    const key = this.physicalKey(storageKey);
    let source: ReturnType<typeof createReadStream> | undefined;
    try {
      const sourceStat = await stat(sourcePath);
      source = createReadStream(sourcePath);
      // Absolute abort deadlines would reject healthy large streams; socket inactivity bounds stalls.
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: source,
          ContentLength: sourceStat.size,
        }),
        { requestTimeout: 0 },
      );
    } catch {
      throw new StorageUnavailableError();
    } finally {
      source?.destroy();
    }
  }

  async read(storageKey: string): Promise<Readable> {
    const key = this.physicalKey(storageKey);
    let output: unknown;
    try {
      // An abort signal stays attached to the streamed body; use an inactivity timeout instead.
      output = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      if (isS3ObjectNotFoundError(error)) throw new StorageObjectNotFoundError();
      throw new StorageUnavailableError();
    }

    const body = (output as { Body?: unknown } | undefined)?.Body;
    if (!(body instanceof Readable)) {
      destroyBody(body);
      throw new StorageUnavailableError();
    }
    setBodyInactivityTimeout(body);
    return body;
  }

  async delete(storageKey: string): Promise<void> {
    const key = this.physicalKey(storageKey);
    try {
      await this.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        S3_OBJECT_OPERATION_TIMEOUT_MS,
      );
    } catch {
      throw new StorageUnavailableError();
    }
  }

  async check(): Promise<void> {
    if (Date.now() < this.successfulCheckExpiresAt) return;
    if (this.checkInFlight) return this.checkInFlight;

    const check = this.performCheck();
    this.checkInFlight = check;
    try {
      await check;
    } finally {
      if (this.checkInFlight === check) this.checkInFlight = undefined;
    }
  }

  private async performCheck(): Promise<void> {
    const probeKey = this.prefixedKey(`${S3_CHECK_PROBE_PREFIX}${randomUUID()}`);
    let body: unknown;
    let checkFailed = false;

    try {
      await this.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: probeKey,
          Body: S3_CHECK_PROBE_BYTES,
          ContentLength: S3_CHECK_PROBE_BYTES.length,
        }),
        S3_READINESS_TIMEOUT_MS,
      );
      const output = await this.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: probeKey }),
        S3_READINESS_TIMEOUT_MS,
      );
      body = (output as { Body?: unknown } | undefined)?.Body;
      const downloaded = await consumeBody(body);
      body = undefined;
      if (!downloaded.equals(S3_CHECK_PROBE_BYTES)) throw new Error("Storage probe mismatch.");
    } catch {
      checkFailed = true;
    } finally {
      destroyBody(body);
      try {
        await this.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: probeKey }),
          S3_READINESS_TIMEOUT_MS,
        );
      } catch {
        checkFailed = true;
      }
    }

    if (checkFailed) throw new StorageUnavailableError();
    this.successfulCheckExpiresAt = Date.now() + S3_CHECK_CACHE_TTL_MS;
  }

  close(): void {
    this.successfulCheckExpiresAt = 0;
    this.client.destroy();
  }
}

export function createPrivateStorageAdapter(
  options: StorageConfig,
  dependencies: PrivateStorageFactoryDependencies = {},
): ManagedPrivateStorageAdapter {
  if (options.driver === "local") {
    return new LocalPrivateStorageAdapter(options.rootDirectory);
  }

  return new S3PrivateStorageAdapter(options, dependencies);
}
