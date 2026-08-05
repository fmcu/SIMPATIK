import { Router, type RequestHandler } from "express";

import { prisma } from "../../config/prisma.js";
import { enforceUptScope, requireRole, requireSession } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../shared/http.js";
import { createAuditRepository } from "../shared/audit.repository.js";
import { DashboardController } from "./dashboard.controller.js";
import { dashboardQuerySchema } from "./dashboard.schema.js";
import { createDashboardRepository } from "./dashboard.repository.js";
import { DashboardService } from "./dashboard.service.js";

const dashboardReaders = [
  "PIMPINAN",
  "PRODUCT_OWNER",
  "PETUGAS_KANWIL",
  "KOORDINATOR_UPT",
  "PETUGAS_UPT",
  "ADMIN_SIMPATIK",
] as const;

export function createDashboardRouter(
  dependencies: { requireSession?: RequestHandler } = {},
): Router {
  const router = Router();
  const controller = new DashboardController(
    new DashboardService(createDashboardRepository(prisma), createAuditRepository(prisma)),
  );
  const session = dependencies.requireSession ?? requireSession;
  router.get(
    "/summary",
    session,
    requireRole(...dashboardReaders),
    enforceUptScope,
    validate(dashboardQuerySchema, "query"),
    asyncHandler(controller.summary),
  );
  router.get(
    "/by-upt",
    session,
    requireRole(...dashboardReaders),
    enforceUptScope,
    validate(dashboardQuerySchema, "query"),
    asyncHandler(controller.byUpt),
  );
  return router;
}
