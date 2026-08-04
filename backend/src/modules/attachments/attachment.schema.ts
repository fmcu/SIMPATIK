import { z } from "zod";

export const reportAttachmentParamsSchema = z.object({ id: z.string().trim().min(1) });
export const attachmentIdParamsSchema = z.object({ id: z.string().trim().min(1) });
