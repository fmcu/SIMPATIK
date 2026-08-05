import { Router, type RequestHandler } from "express";

import { prisma } from "../../config/prisma.js";
import { enforceUptScope, requireRole, requireSession } from "../../middleware/auth.js";
import { roles } from "../../middleware/permissions.js";
import { asyncHandler, validate } from "../shared/http.js";
import { ReportController } from "./report.controller.js";
import { createReportRepository } from "./report.repository.js";
import { createReportAttachmentRouter } from "../attachments/attachment.routes.js";
import { createDocumentRepository } from "../documents/document.repository.js";
import { ReportCompletenessService } from "./report-completeness.service.js";
import { ReportDocumentValidator } from "../documents/document.validation.js";
import {
  reportCreateSchema,
  reportIdParamsSchema,
  reportQuerySchema,
  historyQuerySchema,
  reportUpdateSchema,
  reviewCommentSchema,
} from "./report.schema.js";
import { ReportService } from "./report.service.js";

const reportReaders = roles.reportReaders;

export type ReportControllerHandlers = Pick<
  ReportController,
  | "list"
  | "create"
   | "detail"
   | "history"
   | "submit"
  | "update"
  | "validateCompleteness"
  | "addReviewComment"
  | "requestRevision"
  | "markReviewed"
  | "approve"
>;

type ReportRouterDependencies = {
  controller?: ReportControllerHandlers;
  requireSession?: RequestHandler;
};

export function createReportRouter(dependencies: ReportRouterDependencies = {}): Router {
  const router = Router();
  const controller =
    dependencies.controller ??
    new ReportController(
      new ReportService(
        createReportRepository(prisma),
        new ReportCompletenessService(
          new ReportDocumentValidator(createDocumentRepository(prisma)),
        ),
      ),
    );
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
    requireRole(...roles.uptEditor),
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
  router.get(
    "/:id/history",
    session,
    requireRole(...reportReaders),
    enforceUptScope,
    validate(reportIdParamsSchema, "params"),
    validate(historyQuerySchema, "query"),
    asyncHandler(controller.history),
  );
  router.get(
    "/:id/completeness",
    session,
    requireRole(...roles.reportValidator),
    enforceUptScope,
    validate(reportIdParamsSchema, "params"),
    asyncHandler(controller.validateCompleteness),
  );
  router.use("/:id/attachments", createReportAttachmentRouter());
  router.post(
    "/:id/submit",
    session,
    requireRole(...roles.coordinator),
    enforceUptScope,
    validate(reportIdParamsSchema, "params"),
    asyncHandler(controller.submit),
  );
  router.post(
    "/:id/comments",
    session,
    requireRole(...roles.kanwilReviewer),
    validate(reportIdParamsSchema, "params"),
    validate(reviewCommentSchema, "body"),
    asyncHandler(controller.addReviewComment),
  );
  router.post(
    "/:id/request-revision",
    session,
    requireRole(...roles.kanwilReviewer),
    validate(reportIdParamsSchema, "params"),
    validate(reviewCommentSchema, "body"),
    asyncHandler(controller.requestRevision),
  );
  router.post(
    "/:id/mark-reviewed",
    session,
    requireRole(...roles.kanwilReviewer),
    validate(reportIdParamsSchema, "params"),
    asyncHandler(controller.markReviewed),
  );
  router.post(
    "/:id/approve",
    session,
    requireRole(...roles.productOwner),
    validate(reportIdParamsSchema, "params"),
    asyncHandler(controller.approve),
  );
  router.patch(
    "/:id",
    session,
    requireRole(...roles.uptEditor),
    enforceUptScope,
    validate(reportIdParamsSchema, "params"),
    validate(reportUpdateSchema, "body"),
    asyncHandler(controller.update),
  );

  return router;
}
