import { z } from "zod";

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  action: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});
