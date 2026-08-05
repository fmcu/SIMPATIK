import { type RequestHandler, Router } from "express";
import { rateLimit } from "express-rate-limit";

import { environment } from "../../config/environment.js";
import { prisma } from "../../config/prisma.js";
import { enforceUptScope, requireRole, requireSession } from "../../middleware/auth.js";
import { roles } from "../../middleware/permissions.js";
import type { AuthRequest } from "../../middleware/auth.types.js";
import { AppError } from "../../middleware/error.js";
import { createPrivateStorageAdapter, type PrivateStorageAdapter } from "../../services/private-storage.service.js";
import { asyncHandler, routeParam, sendData, validate } from "../shared/http.js";
import { attachmentIdParamsSchema, reportAttachmentParamsSchema } from "./attachment.schema.js";
import { createAttachmentRepository } from "./attachment.repository.js";
import { AttachmentService } from "./attachment.service.js";
import { parseAttachmentUpload } from "./attachment.upload.js";

const reportReaders = roles.reportReaders;

const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Terlalu banyak unggahan. Coba lagi beberapa saat lagi.",
        fields: [],
      },
    });
  },
});

type AttachmentController = Pick<AttachmentRouteController, "upload" | "download" | "delete">;
type AttachmentRouteDependencies = {
  service?: AttachmentService;
  storage?: PrivateStorageAdapter;
  requireSession?: RequestHandler;
  controller?: AttachmentController;
};

export class AttachmentRouteController {
  constructor(private readonly service: AttachmentService) {}

  upload = async (request: import("express").Request, response: import("express").Response) => {
    const authRequest = request as AuthRequest;
    const uptScopeId = authRequest.uptScopeId;
    if (!uptScopeId) {
      throw new AppError(403, "UPT_SCOPE_FORBIDDEN", "Akun belum memiliki penempatan UPT.");
    }
    const upload = await parseAttachmentUpload(request, environment.MAX_UPLOAD_SIZE);
    try {
      sendData(
        response,
        await this.service.upload({
          reportId: routeParam(request, "id"),
          uptScopeId,
          actorId: authRequest.auth!.user.id,
          ...(upload.reportItemId === undefined ? {} : { reportItemId: upload.reportItemId }),
          ...(upload.requirementId === undefined ? {} : { requirementId: upload.requirementId }),
          file: upload.file,
        }),
      );
    } finally {
      await upload.cleanup();
    }
  };

  download = async (request: import("express").Request, response: import("express").Response) => {
    const { attachment, stream } = await this.service.download(
      routeParam(request, "id"),
      (request as AuthRequest).uptScopeId,
    );
    const fallbackName = attachment.originalName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    response.setHeader("Content-Type", attachment.mimeType);
    response.setHeader("Content-Length", attachment.size);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
    );
    stream.on("error", () => response.destroy());
    stream.pipe(response);
  };

  delete = async (request: import("express").Request, response: import("express").Response) => {
    const authRequest = request as AuthRequest;
    const uptScopeId = authRequest.uptScopeId;
    if (!uptScopeId) {
      throw new AppError(403, "UPT_SCOPE_FORBIDDEN", "Akun belum memiliki penempatan UPT.");
    }
    const id = routeParam(request, "id");
    await this.service.delete(id, uptScopeId, authRequest.auth!.user.id);
    sendData(response, { id });
  };
}

function defaultService(storage?: PrivateStorageAdapter): AttachmentService {
  return new AttachmentService(
    createAttachmentRepository(prisma),
    storage ?? createPrivateStorageAdapter({
      driver: environment.STORAGE_DRIVER,
      bucket: environment.STORAGE_BUCKET,
    }),
    environment.MAX_UPLOAD_SIZE,
  );
}

export function createReportAttachmentRouter(dependencies: AttachmentRouteDependencies = {}): Router {
  const router = Router({ mergeParams: true });
  const controller = dependencies.controller ?? new AttachmentRouteController(defaultService(dependencies.storage));
  const session = dependencies.requireSession ?? requireSession;
  router.post(
    "/",
    session,
    requireRole(...roles.uptEditor),
    enforceUptScope,
    validate(reportAttachmentParamsSchema, "params"),
    uploadRateLimit,
    asyncHandler(controller.upload),
  );
  return router;
}

export function createAttachmentRouter(dependencies: AttachmentRouteDependencies = {}): Router {
  const router = Router();
  const controller = dependencies.controller ?? new AttachmentRouteController(defaultService(dependencies.storage));
  const session = dependencies.requireSession ?? requireSession;
  router.get(
    "/:id/download",
    session,
    requireRole(...reportReaders),
    enforceUptScope,
    validate(attachmentIdParamsSchema, "params"),
    asyncHandler(controller.download),
  );
  router.delete(
    "/:id",
    session,
    requireRole(...roles.uptEditor),
    enforceUptScope,
    validate(attachmentIdParamsSchema, "params"),
    asyncHandler(controller.delete),
  );
  return router;
}
