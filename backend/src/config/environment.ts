import "dotenv/config";

import { z } from "zod";

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
    STORAGE_DRIVER: z.enum(["local"]).default("local"),
    STORAGE_BUCKET: z.string().min(1).default("./storage"),
    MAX_UPLOAD_SIZE: z.coerce.number().int().positive().max(1_073_741_824).default(10_485_760),
  })
  .superRefine((values, context) => {
    const origins = values.TRUSTED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
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
        ) throw new Error();
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
    if (values.NODE_ENV === "production") {
      if (!values.BETTER_AUTH_SECRET || values.BETTER_AUTH_SECRET.length < 32) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["BETTER_AUTH_SECRET"],
          message: "BETTER_AUTH_SECRET minimal 32 karakter pada production.",
        });
      }
      if (!values.WEB_URL.startsWith("https://") || !values.API_URL.startsWith("https://") || !values.BETTER_AUTH_URL.startsWith("https://")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["WEB_URL"],
          message: "WEB_URL, API_URL, dan BETTER_AUTH_URL wajib menggunakan HTTPS pada production.",
        });
      }
      if (values.STORAGE_DRIVER === "local" && values.STORAGE_BUCKET.startsWith("./")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STORAGE_BUCKET"],
          message: "Storage production tidak boleh memakai path relatif.",
        });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema> & {
  trustedOrigins: string[];
};

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const parsed = environmentSchema.parse(source);
  if (parsed.NODE_ENV === "production") {
    const requiredProductionKeys = [
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "TRUSTED_ORIGINS",
      "STORAGE_BUCKET",
    ] as const;
    const missing = requiredProductionKeys.filter((key) => !source[key]);
    if (missing.length) {
      throw new Error(`Environment production belum lengkap: ${missing.join(", ")}`);
    }
    if (parsed.DATABASE_URL === "postgresql://postgres:postgres@localhost:5432/simpatik") {
      throw new Error("DATABASE_URL default tidak boleh digunakan pada production.");
    }
  }
  const trustedOrigins = parsed.TRUSTED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return { ...parsed, trustedOrigins };
}

export const environment = loadEnvironment();
