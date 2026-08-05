import { Router } from "express";
import {
  approvalRequestSchema,
  indicatorCreateSchema,
  indicatorUpdateSchema,
} from "@simpatik/contracts";
import { PrismaClient } from "@prisma/client";

import { requireRole, requireSession } from "../../middleware/auth.js";
import { roles } from "../../middleware/permissions.js";
import type { AuthRequest } from "../../middleware/auth.types.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import { asyncHandler, routeParam, sendData, validate } from "../shared/http.js";
import { createIndicatorRepository } from "./indicator.repository.js";
import { IndicatorService } from "./indicator.service.js";

export function createIndicatorService(
  database: PrismaClient,
  audit: AuditRepository,
): IndicatorService {
  return new IndicatorService(createIndicatorRepository(database), audit);
}

export function createIndicatorRouter(
  service: IndicatorService,
  admin: import("express").RequestHandler[],
): Router {
  const router = Router({ mergeParams: true });
  router.get(
    "/",
    requireSession,
    requireRole(...roles.configurationReaders),
    asyncHandler(async (request, response) => {
      sendData(response, await service.list(routeParam(request, "id")));
    }),
  );
  router.post(
    "/",
    ...admin,
    validate(indicatorCreateSchema, "body"),
    asyncHandler(async (request, response) => {
      sendData(
        response,
        await service.create(
          routeParam(request, "id"),
          request.body,
          (request as AuthRequest).auth!.user.id,
        ),
      );
    }),
  );
  return router;
}

export function createIndicatorMutationRouter(service: IndicatorService): Router {
  const router = Router();
  router.get(
    "/:id",
    requireSession,
    requireRole(...roles.configurationReaders),
    asyncHandler(async (request, response) => {
      sendData(response, await service.detail(routeParam(request, "id")));
    }),
  );
  router.patch(
    "/:id",
    requireSession,
    requireRole(...roles.admin),
    validate(indicatorUpdateSchema, "body"),
    asyncHandler(async (request, response) => {
      sendData(
        response,
        await service.update(
          routeParam(request, "id"),
          request.body,
          (request as AuthRequest).auth!.user.id,
        ),
      );
    }),
  );
  router.post(
    "/:id/approve",
    requireSession,
    requireRole(...roles.productOwner),
    validate(approvalRequestSchema, "body"),
    asyncHandler(async (request, response) => {
      sendData(
        response,
        await service.approve(
          routeParam(request, "id"),
          request.body.status,
          (request as AuthRequest).auth!.user.id,
          request.body.reason,
        ),
      );
    }),
  );
  return router;
}
