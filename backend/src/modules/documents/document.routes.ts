import { Router } from "express";
import {
  approvalRequestSchema,
  requiredDocumentCreateSchema,
  requiredDocumentUpdateSchema,
} from "@simpatik/contracts";
import { PrismaClient } from "@prisma/client";
import type { ZodTypeAny } from "zod";

import { requireRole, requireSession } from "../../middleware/auth.js";
import { roles } from "../../middleware/permissions.js";
import type { AuthRequest } from "../../middleware/auth.types.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import { asyncHandler, routeParam, sendData, validate } from "../shared/http.js";
import { createDocumentRepository } from "./document.repository.js";
import { DocumentService } from "./document.service.js";

export function createDocumentService(
  database: PrismaClient,
  audit: AuditRepository,
): DocumentService {
  return new DocumentService(createDocumentRepository(database), audit);
}

export function createDocumentRouter(
  service: DocumentService,
  admin: import("express").RequestHandler[],
  createSchema: ZodTypeAny = requiredDocumentCreateSchema,
): Router {
  const router = Router({ mergeParams: true });
  router.get(
    "/",
    requireSession,
    requireRole(...roles.configurationReaders),
    asyncHandler(async (request, response) => {
      sendData(response, await service.list({ periodId: routeParam(request, "id") }));
    }),
  );
  router.post(
    "/",
    ...admin,
    validate(createSchema, "body"),
    asyncHandler(async (request, response) => {
      const data = request.body.indicatorId
        ? request.body
        : { ...request.body, periodId: routeParam(request, "id") };
      sendData(
        response,
        await service.create(
          data,
          (request as AuthRequest).auth!.user.id,
          routeParam(request, "id"),
        ),
      );
    }),
  );
  return router;
}

export function createDocumentMutationRouter(service: DocumentService): Router {
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
    validate(requiredDocumentUpdateSchema, "body"),
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
