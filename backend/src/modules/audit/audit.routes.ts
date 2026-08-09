import { Router, type RequestHandler } from "express";

import { prisma } from "../../config/prisma.js";
import { requireRole, requireSession } from "../../middleware/auth.js";
import { roles } from "../../middleware/permissions.js";
import { asyncHandler, paginationMeta, sendData, validate } from "../shared/http.js";
import { createAuditLogReader, type AuditLogReader } from "./audit.repository.js";
import { auditLogQuerySchema } from "./audit.schema.js";

export function createAuditRouter(
  reader: AuditLogReader = createAuditLogReader(prisma),
  session: RequestHandler = requireSession,
): Router {
  const router = Router();

  router.get(
    "/logs",
    session,
    requireRole(...roles.admin),
    validate(auditLogQuerySchema, "query"),
    asyncHandler(async (request, response) => {
      const query = request.query as unknown as {
        page: number;
        pageSize: number;
        action?: string;
        entityType?: string;
        search?: string;
      };
      const result = await reader.list({
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        ...(query.action ? { action: query.action } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.search ? { search: query.search } : {}),
      });
      sendData(response, result.items, paginationMeta(query.page, query.pageSize, result.total));
    }),
  );

  return router;
}
