import { Router, type RequestHandler } from "express";

import { prisma } from "../../config/prisma.js";
import { enforceUptScope, requireRole, requireSession } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../shared/http.js";
import { ReportController } from "./report.controller.js";
import { createReportRepository } from "./report.repository.js";
import {
  reportCreateSchema,
  reportIdParamsSchema,
  reportQuerySchema,
  reportUpdateSchema,
} from "./report.schema.js";
import { ReportService } from "./report.service.js";

const reportReaders = [
  "PIMPINAN",
  "PRODUCT_OWNER",
  "PETUGAS_KANWIL",
  "KOORDINATOR_UPT",
  "PETUGAS_UPT",
] as const;

export type ReportControllerHandlers = Pick<
  ReportController,
  "list" | "create" | "detail" | "update"
>;

type ReportRouterDependencies = {
  controller?: ReportControllerHandlers;
  requireSession?: RequestHandler;
};

export function createReportRouter(dependencies: ReportRouterDependencies = {}): Router {
  const router = Router();
  const controller =
    dependencies.controller ??
    new ReportController(new ReportService(createReportRepository(prisma)));
  const session = dependencies.requireSession ?? requireSession;

  router.get(
    "/",
    session,
    requireRole(...reportReaders),
    enforceUptScope,
    validate(reportQuerySchema, "query"),
    asyncHandler(controller.list),
  );
  router.post(
    "/",
    session,
    requireRole("PETUGAS_UPT"),
    enforceUptScope,
    validate(reportCreateSchema, "body"),
    asyncHandler(controller.create),
  );
  router.get(
    "/:id",
    session,
    requireRole(...reportReaders),
    enforceUptScope,
    validate(reportIdParamsSchema, "params"),
    asyncHandler(controller.detail),
  );
  router.patch(
    "/:id",
    session,
    requireRole("PETUGAS_UPT"),
    enforceUptScope,
    validate(reportIdParamsSchema, "params"),
    validate(reportUpdateSchema, "body"),
    asyncHandler(controller.update),
  );

  return router;
}
