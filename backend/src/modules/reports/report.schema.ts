import { z } from "zod";
import { paginationQuerySchema, reportStatusSchema } from "@simpatik/contracts";

const reportItemInputSchema = z.object({
  indicatorId: z.string().trim().min(1),
  value: z.string().trim().max(10_000).nullable().optional(),
  narrative: z.string().trim().max(20_000).nullable().optional(),
});

export const reportCreateSchema = z.object({
  periodId: z.string().trim().min(1),
  reportType: z.string().trim().min(1).max(100),
});

export const reportUpdateSchema = z
  .object({
    version: z.number().int().positive(),
    items: z.array(reportItemInputSchema).min(1).max(250),
  })
  .superRefine((value, context) => {
    const indicatorIds = new Set<string>();
    value.items.forEach((item, index) => {
      if (indicatorIds.has(item.indicatorId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "indicatorId"],
          message: "Indikator tidak boleh diisi lebih dari sekali.",
        });
      }
      indicatorIds.add(item.indicatorId);
    });
  });

export const reportIdParamsSchema = z.object({ id: z.string().trim().min(1) });

export const reportQuerySchema = paginationQuerySchema.extend({
  periodId: z.string().trim().min(1).optional(),
  uptId: z.string().trim().min(1).optional(),
  status: reportStatusSchema.optional(),
});
