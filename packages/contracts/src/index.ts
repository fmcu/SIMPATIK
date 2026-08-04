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

export const periodStatusSchema = z.enum(["DRAFT", "ACTIVE", "CLOSED"]);

export type PeriodStatus = z.infer<typeof periodStatusSchema>;

export const approvalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const approvalRequestSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "REJECTED" && !value.reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Alasan penolakan wajib diisi.",
      });
    }
  });

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

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
  "AUTHENTICATION_REQUIRED",
  "ROLE_NOT_ALLOWED",
  "UPT_SCOPE_FORBIDDEN",
  "CONFLICT",
  "DATABASE_UNAVAILABLE",
  "PERIOD_INVALID_STATUS",
  "PERIOD_ALREADY_ACTIVE",
  "CONFIGURATION_LOCKED",
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

export const uptCreateSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(200),
  active: z.boolean().default(true),
});

export const uptUpdateSchema = uptCreateSchema.partial();

export const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  role: roleSchema,
  uptId: z.string().trim().min(1).nullable().optional(),
  active: z.boolean().default(true),
});

export const userUpdateSchema = userCreateSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(8).max(128).optional(),
  });

const periodFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  startDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  status: periodStatusSchema.default("DRAFT"),
});

export const periodCreateSchema = periodFieldsSchema.superRefine((value, context) => {
  if (value.startDate > value.dueDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueDate"],
      message: "dueDate harus setelah atau sama dengan startDate.",
    });
  }
});

export const periodUpdateSchema = periodFieldsSchema.partial();

export const indicatorCreateSchema = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  required: z.boolean().default(false),
  order: z.number().int().nonnegative(),
  inputConfig: z.record(z.unknown()).default({}),
});

export const indicatorUpdateSchema = indicatorCreateSchema.partial();

const requiredDocumentFieldsSchema = z.object({
  periodId: z.string().trim().min(1).optional(),
  indicatorId: z.string().trim().min(1).optional(),
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  required: z.boolean().default(true),
  allowedMimeTypes: z.array(z.string().trim().min(1)).min(1).max(50),
  maxSize: z.number().int().positive().max(1_073_741_824),
  order: z.number().int().nonnegative(),
});

export const requiredDocumentCreateSchema = requiredDocumentFieldsSchema.superRefine(
  (value, context) => {
    if ((value.periodId ? 1 : 0) + (value.indicatorId ? 1 : 0) !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodId"],
        message: "Tepat satu periodId atau indicatorId wajib diisi.",
      });
    }
  },
);

export const requiredDocumentUpdateSchema = requiredDocumentFieldsSchema
  .omit({ periodId: true, indicatorId: true })
  .partial();
export const periodDocumentCreateSchema = requiredDocumentFieldsSchema
  .omit({ periodId: true })
  .superRefine((value, context) => {
    if (value.indicatorId === undefined) return;
    if (!value.indicatorId)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["indicatorId"],
        message: "indicatorId tidak valid.",
      });
  });

export type UPTCreate = z.infer<typeof uptCreateSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type PeriodCreate = z.infer<typeof periodCreateSchema>;
export type IndicatorCreate = z.infer<typeof indicatorCreateSchema>;
export type RequiredDocumentCreate = z.infer<typeof requiredDocumentCreateSchema>;

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
