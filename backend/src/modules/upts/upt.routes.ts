import { Router } from "express";
import { uptCreateSchema, uptUpdateSchema } from "@simpatik/contracts";

import { enforceUptScope, requireRole, requireSession } from "../../middleware/auth.js";
import { roles } from "../../middleware/permissions.js";
import type { AuthRequest } from "../../middleware/auth.types.js";
import { asyncHandler, paginationMeta, routeParam, sendData, validate } from "../shared/http.js";
import { createAuditRepository } from "../shared/audit.repository.js";
import { prisma } from "../../config/prisma.js";
import { createUptRepository } from "./upt.repository.js";
import { UptService } from "./upt.service.js";
import { uptIdParamsSchema, uptQuerySchema } from "./upt.schema.js";

export function createUptRouter(): Router {
  const router = Router();
  const service = new UptService(createUptRepository(prisma), createAuditRepository(prisma));
  const readers = roles.uptReaders;
  const admin = [requireSession, requireRole(...roles.admin)];

  router.get(
    "/",
    requireSession,
    requireRole(...readers),
    enforceUptScope,
    validate(uptQuerySchema, "query"),
    asyncHandler(async (request, response) => {
      const query = request.query as unknown as {
        page: number;
        pageSize: number;
        search?: string;
        active?: boolean;
      };
      const result = await service.list({
        ...query,
        uptScopeId: (request as AuthRequest).uptScopeId,
      });
      sendData(response, result.items, paginationMeta(query.page, query.pageSize, result.total));
    }),
  );

  router.post(
    "/",
    ...admin,
    validate(uptCreateSchema, "body"),
    asyncHandler(async (request, response) => {
      const item = await service.create(request.body, (request as AuthRequest).auth!.user.id);
      sendData(response, item);
    }),
  );

  router.patch(
    "/:id",
    ...admin,
    validate(uptIdParamsSchema, "params"),
    validate(uptUpdateSchema, "body"),
    asyncHandler(async (request, response) => {
      const item = await service.update(
        routeParam(request, "id"),
        request.body,
        (request as AuthRequest).auth!.user.id,
      );
      sendData(response, item);
    }),
  );

  router.post(
    "/:id/activate",
    ...admin,
    validate(uptIdParamsSchema, "params"),
    asyncHandler(async (request, response) => {
      const item = await service.update(
        routeParam(request, "id"),
        { active: true },
        (request as AuthRequest).auth!.user.id,
        "UPT_ACTIVATED",
      );
      sendData(response, item);
    }),
  );

  router.post(
    "/:id/deactivate",
    ...admin,
    validate(uptIdParamsSchema, "params"),
    asyncHandler(async (request, response) => {
      const item = await service.update(
        routeParam(request, "id"),
        { active: false },
        (request as AuthRequest).auth!.user.id,
        "UPT_DEACTIVATED",
      );
      sendData(response, item);
    }),
  );

  return router;
}
