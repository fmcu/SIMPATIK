import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { prisma } from "../../config/prisma.js";
import { enforceUptScope, requireRole, requireSession } from "../../middleware/auth.js";
import { roles } from "../../middleware/permissions.js";
import { asyncHandler, validate } from "../shared/http.js";
import { createAuditRepository } from "../shared/audit.repository.js";
import { createDashboardRepository } from "../dashboard/dashboard.repository.js";
import { dashboardQuerySchema } from "../dashboard/dashboard.schema.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { ExportController } from "./export.controller.js";

const exportReaders = roles.exportReaders;

const exportRateLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Terlalu banyak ekspor. Coba lagi beberapa saat lagi.",
        fields: [],
      },
    });
  },
});

export function createExportRouter(
  dependencies: { requireSession?: import("express").RequestHandler } = {},
): Router {
  const router = Router();
  const controller = new ExportController(
    new DashboardService(createDashboardRepository(prisma), createAuditRepository(prisma)),
  );
  const session = dependencies.requireSession ?? requireSession;
  router.get(
    "/reports.csv",
    session,
    requireRole(...exportReaders),
    enforceUptScope,
    validate(dashboardQuerySchema, "query"),
    exportRateLimit,
    asyncHandler(controller.reportsCsv),
  );
  return router;
}
