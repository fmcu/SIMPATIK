import { Router } from "express";
import { userCreateSchema, userUpdateSchema } from "@simpatik/contracts";

import { prisma } from "../../config/prisma.js";
import { requireRole, requireSession } from "../../middleware/auth.js";
import { roles } from "../../middleware/permissions.js";
import type { AuthRequest } from "../../middleware/auth.types.js";
import { createAuditRepository } from "../shared/audit.repository.js";
import { asyncHandler, paginationMeta, routeParam, sendData, validate } from "../shared/http.js";
import { createUserRepository } from "./user.repository.js";
import { UserService } from "./user.service.js";
import { userIdParamsSchema, userQuerySchema } from "./user.schema.js";

function publicUser<
  T extends {
    id: string;
    name: string;
    email: string;
    role: unknown;
    uptId: string | null;
    active: boolean;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
>(user: T) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    uptId: user.uptId,
    active: user.active,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function createUserRouter(): Router {
  const router = Router();
  const service = new UserService(createUserRepository(prisma), createAuditRepository(prisma));
  const admin = [requireSession, requireRole(...roles.admin)];

  router.get(
    "/",
    ...admin,
    validate(userQuerySchema, "query"),
    asyncHandler(async (request, response) => {
      const query = request.query as unknown as {
        page: number;
        pageSize: number;
        search?: string;
        role?: string;
        uptId?: string;
        active?: boolean;
      };
      const result = await service.list(query);
      sendData(
        response,
        result.items.map(publicUser),
        paginationMeta(query.page, query.pageSize, result.total),
      );
    }),
  );

  router.post(
    "/",
    ...admin,
    validate(userCreateSchema, "body"),
    asyncHandler(async (request, response) => {
      const user = await service.create(request.body, (request as AuthRequest).auth!.user.id);
      sendData(response, publicUser(user));
    }),
  );

  router.patch(
    "/:id",
    ...admin,
    validate(userIdParamsSchema, "params"),
    validate(userUpdateSchema, "body"),
    asyncHandler(async (request, response) => {
      const user = await service.update(
        routeParam(request, "id"),
        request.body,
        (request as AuthRequest).auth!.user.id,
      );
      sendData(response, publicUser(user));
    }),
  );

  router.post(
    "/:id/activate",
    ...admin,
    validate(userIdParamsSchema, "params"),
    asyncHandler(async (request, response) => {
      const user = await service.update(
        routeParam(request, "id"),
        { active: true },
        (request as AuthRequest).auth!.user.id,
        "USER_ACTIVATED",
      );
      sendData(response, publicUser(user));
    }),
  );

  router.post(
    "/:id/deactivate",
    ...admin,
    validate(userIdParamsSchema, "params"),
    asyncHandler(async (request, response) => {
      const user = await service.update(
        routeParam(request, "id"),
        { active: false },
        (request as AuthRequest).auth!.user.id,
        "USER_DEACTIVATED",
      );
      sendData(response, publicUser(user));
    }),
  );

  return router;
}
