import { z } from "zod";

export const roleSchema = z.enum([
  "PIMPINAN",
  "PRODUCT_OWNER",
  "PETUGAS_KANWIL",
  "KOORDINATOR_UPT",
  "PETUGAS_UPT",
  "ADMIN_SIMPATIK",
  "SYSTEM_ADMIN",
]);

export type Role = z.infer<typeof roleSchema>;

export const reportStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "REVISION_REQUIRED",
  "REVIEWED",
  "APPROVED",
]);

export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const apiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONFLICT",
  "DATABASE_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiFieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type ApiFieldError = z.infer<typeof apiFieldErrorSchema>;

export const apiMetaSchema = z
  .object({
    requestId: z.string().optional(),
    pagination: paginationSchema.optional(),
  })
  .passthrough();

export type ApiMeta = z.infer<typeof apiMetaSchema>;

export const apiSuccessSchema = z.object({
  data: z.unknown(),
  meta: apiMetaSchema.default({}),
});

export type ApiSuccess<T> = {
  data: T;
  meta?: ApiMeta;
};

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    fields: z.array(apiFieldErrorSchema),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthStatusSchema = z.enum(["ok", "ready"]);

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export function success<T>(data: T, meta: ApiMeta = {}): ApiSuccess<T> {
  return { data, meta };
}

export function failure(
  code: ApiErrorCode,
  message: string,
  fields: ApiFieldError[] = [],
): ApiError {
  return { error: { code, message, fields } };
}
