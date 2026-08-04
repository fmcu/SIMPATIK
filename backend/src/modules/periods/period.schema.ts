import { periodStatusSchema } from "@simpatik/contracts";
import { z } from "zod";

export const periodIdParamsSchema = z.object({ id: z.string().min(1) });
export const periodQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  status: periodStatusSchema.optional(),
  search: z.string().trim().optional(),
});
