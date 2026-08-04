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
    STORAGE_DRIVER: z.string().default("local"),
    STORAGE_BUCKET: z.string().min(1).default("./storage"),
    MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(10_485_760),
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV === "production" && !values.BETTER_AUTH_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BETTER_AUTH_SECRET"],
        message: "BETTER_AUTH_SECRET wajib diisi pada production.",
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema> & {
  trustedOrigins: string[];
};

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const parsed = environmentSchema.parse(source);
  const trustedOrigins = parsed.TRUSTED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return { ...parsed, trustedOrigins };
}

export const environment = loadEnvironment();
