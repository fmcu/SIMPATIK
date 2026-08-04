import { z } from "zod";

export const userIdParamsSchema = z.object({ id: z.string().min(1) });
export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().optional(),
  role: z.string().optional(),
  uptId: z.string().optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
