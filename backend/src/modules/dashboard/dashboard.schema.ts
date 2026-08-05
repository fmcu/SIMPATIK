import { z } from "zod";
import { paginationQuerySchema, reportStatusSchema } from "@simpatik/contracts";

export const dashboardQuerySchema = paginationQuerySchema
  .extend({
    pageSize: z.coerce.number().int().positive().max(1_000).default(25),
    periodId: z.string().trim().min(1).optional(),
    uptId: z.string().trim().min(1).optional(),
    status: reportStatusSchema.optional(),
    reportType: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
