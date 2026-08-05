import { Router } from "express";
import {
  periodCreateSchema,
  periodUpdateSchema,
  periodDocumentCreateSchema,
} from "@simpatik/contracts";

import { prisma } from "../../config/prisma.js";
import { requireRole, requireSession } from "../../middleware/auth.js";
import { roles } from "../../middleware/permissions.js";
import type { AuthRequest } from "../../middleware/auth.types.js";
import { createAuditRepository } from "../shared/audit.repository.js";
import { asyncHandler, paginationMeta, routeParam, sendData, validate } from "../shared/http.js";
import { createPeriodRepository } from "./period.repository.js";
import { PeriodService } from "./period.service.js";
import { periodIdParamsSchema, periodQuerySchema } from "./period.schema.js";
import { createIndicatorRouter, createIndicatorService } from "../indicators/indicator.routes.js";
import { createDocumentRouter, createDocumentService } from "../documents/document.routes.js";

export function createPeriodRouter(): Router {
  const router = Router();
  const periodService = new PeriodService(
    createPeriodRepository(prisma),
    createAuditRepository(prisma),
  );
  const admin = [requireSession, requireRole(...roles.admin)];
  const audit = createAuditRepository(prisma);

  router.get(
    "/",
    requireSession,
    requireRole(...roles.configurationReaders),
    validate(periodQuerySchema, "query"),
    asyncHandler(async (request, response) => {
      const query = request.query as unknown as {
        page: number;
        pageSize: number;
        status?: "DRAFT" | "ACTIVE" | "CLOSED";
        search?: string;
      };
      const result = await periodService.list(query);
      sendData(response, result.items, paginationMeta(query.page, query.pageSize, result.total));
    }),
  );

  router.post(
    "/",
    ...admin,
    validate(periodCreateSchema, "body"),
    asyncHandler(async (request, response) => {
      sendData(
        response,
        await periodService.create(request.body, (request as AuthRequest).auth!.user.id),
      );
    }),
  );

  router.get(
    "/:id",
    requireSession,
    requireRole(...roles.configurationReaders),
    validate(periodIdParamsSchema, "params"),
    asyncHandler(async (request, response) => {
      sendData(response, await periodService.detail(routeParam(request, "id")));
    }),
  );

  router.patch(
    "/:id",
    ...admin,
    validate(periodIdParamsSchema, "params"),
    validate(periodUpdateSchema, "body"),
    asyncHandler(async (request, response) => {
      sendData(
        response,
        await periodService.update(
          routeParam(request, "id"),
          request.body,
          (request as AuthRequest).auth!.user.id,
        ),
      );
    }),
  );

  router.use(
    "/:id/indicators",
    validate(periodIdParamsSchema, "params"),
    createIndicatorRouter(createIndicatorService(prisma, audit), admin),
  );
  router.use(
    "/:id/documents",
    validate(periodIdParamsSchema, "params"),
    createDocumentRouter(createDocumentService(prisma, audit), admin, periodDocumentCreateSchema),
  );
  return router;
}
