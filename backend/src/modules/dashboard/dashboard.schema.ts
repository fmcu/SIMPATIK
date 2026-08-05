import { z } from "zod";
import { reportStatusSchema } from "@simpatik/contracts";

export const dashboardQuerySchema = z.object({
  periodId: z.string().trim().min(1).optional(),
  uptId: z.string().trim().min(1).optional(),
  status: reportStatusSchema.optional(),
  reportType: z.string().trim().min(1).max(100).optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
