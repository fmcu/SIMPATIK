import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "./environment.js";

const productionSource = {
  NODE_ENV: "production",
  PORT: "4000",
  WEB_URL: "https://simpatik.example.go.id",
  API_URL: "https://simpatik.example.go.id/api",
  DATABASE_URL: "postgresql://app:strong-password@db.internal:5432/simpatik",
  BETTER_AUTH_URL: "https://simpatik.example.go.id/api",
  BETTER_AUTH_SECRET: "12345678901234567890123456789012",
  TRUSTED_ORIGINS: "https://simpatik.example.go.id",
  STORAGE_DRIVER: "local",
  STORAGE_BUCKET: "/var/lib/simpatik/storage",
  MAX_UPLOAD_SIZE: "10485760",
};

test("production environment requires explicit secure origins", () => {
  assert.throws(() =>
    loadEnvironment({
      ...productionSource,
      TRUSTED_ORIGINS: "http://simpatik.example.go.id",
    }),
  );
  assert.throws(() =>
    loadEnvironment({
      ...productionSource,
      WEB_URL: "https://simpatik.example.go.id",
      TRUSTED_ORIGINS: "https://other.example.go.id",
    }),
  );
});

test("production environment rejects default database credentials", () => {
  assert.throws(() =>
    loadEnvironment({
      ...productionSource,
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/simpatik",
    }),
  );
});

test("development keeps local storage defaults", () => {
  const environment = loadEnvironment({ NODE_ENV: "development" });

  assert.equal(environment.STORAGE_DRIVER, "local");
  assert.equal(environment.STORAGE_BUCKET, "./storage");
  assert.deepEqual(environment.storageConfig, {
    driver: "local",
    rootDirectory: "./storage",
  });
});

test("production requires explicit storage driver and bucket", () => {
  const withoutDriver: NodeJS.ProcessEnv = { ...productionSource };
  const withoutBucket: NodeJS.ProcessEnv = { ...productionSource };
  delete withoutDriver.STORAGE_DRIVER;
  delete withoutBucket.STORAGE_BUCKET;

  assert.throws(
    () => loadEnvironment(withoutDriver),
    /Environment production belum lengkap: STORAGE_DRIVER/,
  );
  assert.throws(
    () => loadEnvironment(withoutBucket),
    /Environment production belum lengkap: STORAGE_BUCKET/,
  );
});

test("production local storage requires an absolute path", () => {
  for (const storageBucket of ["storage", "../storage", ".hidden-storage"]) {
    assert.throws(() =>
      loadEnvironment({
        ...productionSource,
        STORAGE_BUCKET: storageBucket,
      }),
    );
  }

  assert.deepEqual(loadEnvironment(productionSource).storageConfig, {
    driver: "local",
    rootDirectory: "/var/lib/simpatik/storage",
  });
});

test("S3 storage requires region and exposes factory config", () => {
  assert.throws(() =>
    loadEnvironment({
      STORAGE_DRIVER: "s3",
      STORAGE_BUCKET: "simpatik-attachments",
    }),
  );

  const environment = loadEnvironment({
    STORAGE_DRIVER: "s3",
    STORAGE_BUCKET: "simpatik-attachments",
    S3_REGION: "ap-southeast-3",
  });

  assert.deepEqual(environment.storageConfig, {
    driver: "s3",
    bucket: "simpatik-attachments",
    region: "ap-southeast-3",
    forcePathStyle: false,
    keyPrefix: "",
  });
  assert.equal("endpoint" in environment.storageConfig, false);
});

test("S3 storage accepts common DNS-compatible bucket names", () => {
  for (const storageBucket of [
    "abc",
    "simpatik-attachments",
    "simpatik.attachments",
    "r2-bucket-2026",
    "wasabi.archive-01",
    `a${"b".repeat(61)}c`,
  ]) {
    const environment = loadEnvironment({
      STORAGE_DRIVER: "s3",
      STORAGE_BUCKET: storageBucket,
      S3_REGION: "us-east-1",
    });

    assert.equal(environment.STORAGE_BUCKET, storageBucket);
    assert.equal(environment.storageConfig.driver, "s3");
    if (environment.storageConfig.driver !== "s3") assert.fail("Expected S3 storage config.");
    assert.equal(environment.storageConfig.bucket, storageBucket);
  }
});

test("S3 storage rejects bucket names outside the common provider subset", () => {
  const invalidBucketNames = [
    "ab",
    `a${"b".repeat(62)}c`,
    "Simpatik",
    "simpatik_bucket",
    "simpatik bucket",
    " simpatik-bucket",
    "simpatik-bucket ",
    ".simpatik",
    "-simpatik",
    "simpatik.",
    "simpatik-",
    "simpatik..attachments",
    "simpatik.-attachments",
    "simpatik-.attachments",
    "192.168.0.1",
    "999.999.999.999",
    "https://example.com/bucket",
    "example.com/bucket",
    "example.com\\bucket",
    "simpatik\u0000bucket",
    "simpatik\nbucket",
  ];

  for (const storageBucket of invalidBucketNames) {
    assert.throws(
      () =>
        loadEnvironment({
          STORAGE_DRIVER: "s3",
          STORAGE_BUCKET: storageBucket,
          S3_REGION: "us-east-1",
        }),
      `Expected S3 bucket name to be rejected: ${JSON.stringify(storageBucket)}`,
    );
  }
});

test("S3 bucket restrictions do not affect local storage paths", () => {
  for (const storageBucket of [
    "./storage",
    "../shared/storage",
    "/var/lib/simpatik/storage",
    "C:\\simpatik\\storage",
    "Storage_Files",
  ]) {
    const environment = loadEnvironment({
      STORAGE_DRIVER: "local",
      STORAGE_BUCKET: storageBucket,
    });

    assert.deepEqual(environment.storageConfig, {
      driver: "local",
      rootDirectory: storageBucket,
    });
  }
});

test("custom S3 endpoint defaults path style to true and normalizes prefix", () => {
  const environment = loadEnvironment({
    STORAGE_DRIVER: "s3",
    STORAGE_BUCKET: "simpatik-attachments",
    S3_REGION: "us-east-1",
    S3_ENDPOINT: "http://localhost:9000",
    S3_KEY_PREFIX: "/tenant-a/attachments/",
  });

  assert.deepEqual(environment.storageConfig, {
    driver: "s3",
    bucket: "simpatik-attachments",
    region: "us-east-1",
    endpoint: "http://localhost:9000",
    forcePathStyle: true,
    keyPrefix: "tenant-a/attachments",
  });
});

test("literal false overrides custom endpoint path-style default", () => {
  const environment = loadEnvironment({
    STORAGE_DRIVER: "s3",
    STORAGE_BUCKET: "simpatik-attachments",
    S3_REGION: "us-east-1",
    S3_ENDPOINT: "http://localhost:9000",
    S3_FORCE_PATH_STYLE: "false",
  });

  assert.equal(environment.S3_FORCE_PATH_STYLE, false);
  assert.equal(environment.storageConfig.driver, "s3");
  if (environment.storageConfig.driver !== "s3") assert.fail("Expected S3 storage config.");
  assert.equal(environment.storageConfig.forcePathStyle, false);
  assert.throws(() =>
    loadEnvironment({
      STORAGE_DRIVER: "s3",
      STORAGE_BUCKET: "simpatik-attachments",
      S3_REGION: "us-east-1",
      S3_FORCE_PATH_STYLE: "FALSE",
    }),
  );
});

test("blank S3 endpoint becomes undefined", () => {
  const environment = loadEnvironment({
    STORAGE_DRIVER: "s3",
    STORAGE_BUCKET: "simpatik-attachments",
    S3_REGION: "us-east-1",
    S3_ENDPOINT: "   ",
  });

  assert.equal(environment.S3_ENDPOINT, undefined);
  assert.deepEqual(environment.storageConfig, {
    driver: "s3",
    bucket: "simpatik-attachments",
    region: "us-east-1",
    forcePathStyle: false,
    keyPrefix: "",
  });
});

test("S3 endpoint must be a safe root HTTP(S) URL", () => {
  for (const endpoint of [
    "ftp://s3.example.com",
    "https://user:password@s3.example.com",
    "https://s3.example.com/path",
    "https://s3.example.com?query=yes",
    "https://s3.example.com#fragment",
  ]) {
    assert.throws(() =>
      loadEnvironment({
        STORAGE_DRIVER: "s3",
        STORAGE_BUCKET: "simpatik-attachments",
        S3_REGION: "us-east-1",
        S3_ENDPOINT: endpoint,
      }),
    );
  }

  assert.throws(() =>
    loadEnvironment({
      ...productionSource,
      STORAGE_DRIVER: "s3",
      STORAGE_BUCKET: "simpatik-attachments",
      S3_REGION: "us-east-1",
      S3_ENDPOINT: "http://s3.internal.example.com",
    }),
  );
  assert.doesNotThrow(() =>
    loadEnvironment({
      ...productionSource,
      STORAGE_DRIVER: "s3",
      STORAGE_BUCKET: "simpatik-attachments",
      S3_REGION: "us-east-1",
      S3_ENDPOINT: "https://s3.internal.example.com",
    }),
  );
});

test("S3 key prefix rejects unsafe path segments and characters", () => {
  for (const keyPrefix of [
    "tenant//attachments",
    "tenant/./attachments",
    "../tenant",
    "tenant\\attachments",
    "tenant\u0000attachments",
  ]) {
    assert.throws(() =>
      loadEnvironment({
        STORAGE_DRIVER: "s3",
        STORAGE_BUCKET: "simpatik-attachments",
        S3_REGION: "us-east-1",
        S3_KEY_PREFIX: keyPrefix,
      }),
    );
  }
});

test("trusted origins remain trimmed and exported", () => {
  const environment = loadEnvironment({
    WEB_URL: "https://app.example.com",
    TRUSTED_ORIGINS: " https://app.example.com, https://admin.example.com ",
  });

  assert.deepEqual(environment.trustedOrigins, [
    "https://app.example.com",
    "https://admin.example.com",
  ]);
});

test("local storage ignores inactive S3 settings", () => {
  const environment = loadEnvironment({
    STORAGE_DRIVER: "local",
    STORAGE_BUCKET: "./storage",
    S3_REGION: "us-east-1",
    S3_ENDPOINT: "not a url",
    S3_KEY_PREFIX: "tenant//broken",
  });

  assert.deepEqual(environment.storageConfig, {
    driver: "local",
    rootDirectory: "./storage",
  });
  assert.equal(environment.S3_ENDPOINT, undefined);
  assert.equal(environment.S3_FORCE_PATH_STYLE, undefined);
});
