import "dotenv/config";

import path from "node:path";

import { z } from "zod";

const optionalTrimmedStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const literalBooleanSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
);

const s3BucketNameSchema = z.string().superRefine((value, context) => {
  if (value.length < 3 || value.length > 63) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "STORAGE_BUCKET S3 harus terdiri dari 3 sampai 63 karakter.",
    });
  }
  if (!/^[a-z0-9.-]+$/.test(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "STORAGE_BUCKET S3 hanya boleh mengandung huruf kecil, angka, titik, dan tanda hubung.",
    });
  }
  if (!/^[a-z0-9]/.test(value) || !/[a-z0-9]$/.test(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "STORAGE_BUCKET S3 harus diawali dan diakhiri huruf kecil atau angka.",
    });
  }
  if (value.includes("..")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "STORAGE_BUCKET S3 tidak boleh mengandung titik berurutan.",
    });
  }
  if (value.includes(".-") || value.includes("-.")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "STORAGE_BUCKET S3 tidak boleh mengandung titik dan tanda hubung bersebelahan.",
    });
  }
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "STORAGE_BUCKET S3 tidak boleh menyerupai alamat IPv4.",
    });
  }
});

const s3KeyPrefixSchema = z
  .string()
  .default("")
  .transform((value) => value.replace(/^\/+|\/+$/g, ""))
  .superRefine((value, context) => {
    if (/[\p{Cc}\\]/u.test(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "S3_KEY_PREFIX tidak boleh mengandung backslash atau karakter kontrol.",
      });
    }
    if (value && value.split("/").some((segment) => segment === "")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "S3_KEY_PREFIX tidak boleh mengandung segmen kosong.",
      });
    }
    if (value && value.split("/").some((segment) => segment === "." || segment === "..")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "S3_KEY_PREFIX tidak boleh mengandung dot segment.",
      });
    }
  });

const s3OnlySchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    S3_REGION: optionalTrimmedStringSchema,
    S3_ENDPOINT: optionalTrimmedStringSchema,
    S3_FORCE_PATH_STYLE: literalBooleanSchema,
    S3_KEY_PREFIX: s3KeyPrefixSchema,
  })
  .superRefine((values, context) => {
    if (!values.S3_REGION) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["S3_REGION"],
        message: "S3_REGION wajib diisi untuk storage S3.",
      });
    }
    if (values.S3_ENDPOINT) {
      try {
        const endpoint = new URL(values.S3_ENDPOINT);
        if (
          !["http:", "https:"].includes(endpoint.protocol) ||
          endpoint.username ||
          endpoint.password ||
          endpoint.pathname !== "/" ||
          endpoint.search ||
          endpoint.hash ||
          (values.NODE_ENV === "production" && endpoint.protocol !== "https:")
        )
          throw new Error();
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["S3_ENDPOINT"],
          message:
            "S3_ENDPOINT harus berupa root URL HTTP(S) tanpa userinfo, path, query, atau fragment; HTTPS wajib pada production.",
        });
      }
    }
  });

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().max(65535).default(4000),
    WEB_URL: z.string().url().default("http://localhost:3000"),
    API_URL: z.string().url().default("http://localhost:4000"),
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgresql://postgres:postgres@localhost:5432/simpatik"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
    BETTER_AUTH_SECRET: z.string().optional(),
    TRUSTED_ORIGINS: z.string().default("http://localhost:3000"),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_BUCKET: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().min(1).default("./storage"),
    ),
    MAX_UPLOAD_SIZE: z.coerce.number().int().positive().max(1_073_741_824).default(10_485_760),
  })
  .superRefine((values, context) => {
    const origins = values.TRUSTED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (origins.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TRUSTED_ORIGINS"],
        message: "Minimal satu trusted origin wajib diisi.",
      });
    }
    origins.forEach((origin) => {
      try {
        const parsed = new URL(origin);
        if (
          !["http:", "https:"].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password ||
          parsed.pathname !== "/" ||
          parsed.search ||
          parsed.hash
        )
          throw new Error();
        if (values.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error();
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["TRUSTED_ORIGINS"],
          message: `Trusted origin tidak valid: ${origin}`,
        });
      }
    });
    try {
      const webUrl = new URL(values.WEB_URL);
      if (webUrl.pathname !== "/" || webUrl.search || webUrl.hash) throw new Error();
      if (!origins.includes(webUrl.origin)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["TRUSTED_ORIGINS"],
          message: "WEB_URL wajib termasuk dalam TRUSTED_ORIGINS.",
        });
      }
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["WEB_URL"],
        message: "WEB_URL harus berupa origin tanpa path, query, atau fragment.",
      });
    }
    if (values.STORAGE_DRIVER === "s3") {
      const bucketResult = s3BucketNameSchema.safeParse(values.STORAGE_BUCKET);
      if (!bucketResult.success) {
        bucketResult.error.issues.forEach((issue) => {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["STORAGE_BUCKET"],
            message: issue.message,
          });
        });
      }
    }
    if (values.NODE_ENV === "production") {
      if (!values.BETTER_AUTH_SECRET || values.BETTER_AUTH_SECRET.length < 32) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["BETTER_AUTH_SECRET"],
          message: "BETTER_AUTH_SECRET minimal 32 karakter pada production.",
        });
      }
      if (
        !values.WEB_URL.startsWith("https://") ||
        !values.API_URL.startsWith("https://") ||
        !values.BETTER_AUTH_URL.startsWith("https://")
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["WEB_URL"],
          message: "WEB_URL, API_URL, dan BETTER_AUTH_URL wajib menggunakan HTTPS pada production.",
        });
      }
      if (values.STORAGE_DRIVER === "local" && !path.isAbsolute(values.STORAGE_BUCKET)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STORAGE_BUCKET"],
          message: "Storage local production wajib memakai path absolut.",
        });
      }
    }
  });

export type StorageConfig =
  | { driver: "local"; rootDirectory: string }
  | {
      driver: "s3";
      bucket: string;
      region: string;
      endpoint?: string;
      forcePathStyle: boolean;
      keyPrefix: string;
    };

export type Environment = z.infer<typeof environmentSchema> & {
  S3_REGION?: string;
  S3_ENDPOINT?: string;
  S3_FORCE_PATH_STYLE?: boolean;
  S3_KEY_PREFIX: string;
  trustedOrigins: string[];
  storageConfig: StorageConfig;
};

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  if (source.NODE_ENV === "production") {
    const requiredProductionKeys = [
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "TRUSTED_ORIGINS",
      "STORAGE_DRIVER",
      "STORAGE_BUCKET",
    ] as const;
    const missing = requiredProductionKeys.filter((key) => !source[key]?.trim());
    if (missing.length) {
      throw new Error(`Environment production belum lengkap: ${missing.join(", ")}`);
    }
  }
  if (source.STORAGE_DRIVER === "s3") {
    const missing = (["STORAGE_BUCKET", "S3_REGION"] as const).filter(
      (key) => !source[key]?.trim(),
    );
    if (missing.length) {
      throw new Error(`Environment S3 belum lengkap: ${missing.join(", ")}`);
    }
  }

  const parsed = environmentSchema.parse(source);
  if (parsed.NODE_ENV === "production") {
    if (parsed.DATABASE_URL === "postgresql://postgres:postgres@localhost:5432/simpatik") {
      throw new Error("DATABASE_URL default tidak boleh digunakan pada production.");
    }
  }
  const trustedOrigins = parsed.TRUSTED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (parsed.STORAGE_DRIVER === "s3") {
    const s3 = s3OnlySchema.parse({ ...source, NODE_ENV: parsed.NODE_ENV });
    return {
      ...parsed,
      ...(s3.S3_REGION ? { S3_REGION: s3.S3_REGION } : {}),
      ...(s3.S3_ENDPOINT ? { S3_ENDPOINT: s3.S3_ENDPOINT } : {}),
      ...(s3.S3_FORCE_PATH_STYLE === undefined
        ? {}
        : { S3_FORCE_PATH_STYLE: s3.S3_FORCE_PATH_STYLE }),
      S3_KEY_PREFIX: s3.S3_KEY_PREFIX,
      trustedOrigins,
      storageConfig: {
        driver: "s3",
        bucket: parsed.STORAGE_BUCKET,
        region: s3.S3_REGION!,
        ...(s3.S3_ENDPOINT ? { endpoint: s3.S3_ENDPOINT } : {}),
        forcePathStyle: s3.S3_FORCE_PATH_STYLE ?? Boolean(s3.S3_ENDPOINT),
        keyPrefix: s3.S3_KEY_PREFIX,
      },
    };
  }

  return {
    ...parsed,
    S3_KEY_PREFIX: "",
    trustedOrigins,
    storageConfig: { driver: "local", rootDirectory: parsed.STORAGE_BUCKET },
  };
}

export const environment = loadEnvironment();
