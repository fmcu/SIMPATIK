import cors from "cors";
import { rateLimit } from "express-rate-limit";
import express from "express";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";

import { environment } from "./config/environment.js";
import { AppError } from "./middleware/error.js";
import { auth } from "./modules/auth/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/error.js";
import { logger } from "./middleware/logger.js";
import { requestId } from "./middleware/request-id.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import type { DatabaseReadinessClient } from "./services/readiness.service.js";
import type { ManagedPrivateStorageAdapter } from "./services/private-storage.service.js";
import { createUptRouter } from "./modules/upts/upt.routes.js";
import { createUserRouter } from "./modules/users/user.routes.js";
import { createPeriodRouter } from "./modules/periods/period.routes.js";
import { createIndicatorMutationRouter } from "./modules/indicators/indicator.routes.js";
import { createDocumentMutationRouter } from "./modules/documents/document.routes.js";
import { createIndicatorService } from "./modules/indicators/indicator.routes.js";
import { createDocumentService } from "./modules/documents/document.routes.js";
import { createReportRouter } from "./modules/reports/report.routes.js";
import { createAttachmentRouter } from "./modules/attachments/attachment.routes.js";
import { createDashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { createExportRouter } from "./modules/exports/export.routes.js";
import { createAuditRouter } from "./modules/audit/audit.routes.js";
import { createAuditRepository } from "./modules/shared/audit.repository.js";
import { prisma } from "./config/prisma.js";

export type AppDependencies = {
  database?: DatabaseReadinessClient;
  storage: ManagedPrivateStorageAdapter;
  healthRequireSession?: import("express").RequestHandler;
};

export function createApp(dependencies: AppDependencies): express.Express {
  const database = dependencies.database ?? prisma;
  const storage = dependencies.storage;
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", environment.NODE_ENV === "production" ? 1 : false);
  app.use(
    helmet({
      contentSecurityPolicy: environment.NODE_ENV === "production",
      hsts: environment.NODE_ENV === "production",
      referrerPolicy: { policy: "no-referrer" },
      frameguard: { action: "deny" },
    }),
  );
  app.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(requestId);
  app.use((request, _response, next) => {
    const contentLength = Number(request.headers["content-length"] ?? 0);
    const maxRequestSize = request.is("multipart/form-data")
      ? environment.MAX_UPLOAD_SIZE + 65_536
      : 1_048_576;
    if (Number.isFinite(contentLength) && contentLength > maxRequestSize) {
      next(new AppError(413, "REQUEST_TOO_LARGE", "Ukuran request melebihi batas yang diizinkan."));
      return;
    }
    next();
  });
  app.use((request, _response, next) => {
    const origin = request.headers.origin;
    if (origin && !environment.trustedOrigins.includes(origin)) {
      next(new AppError(403, "FORBIDDEN", "Origin tidak diizinkan."));
      return;
    }
    next();
  });
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        callback(null, !origin || environment.trustedOrigins.includes(origin));
      },
    }),
  );
  app.use(logger);
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1_000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      skip: (request) => request.path.startsWith("/health"),
      handler: (_request, response) => {
        response.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Terlalu banyak permintaan. Coba lagi beberapa saat lagi.",
            fields: [],
          },
        });
      },
    }),
  );
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json({ limit: "1mb", strict: true }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));

  app.use(
    "/health",
    createHealthRouter({
      database,
      storage,
      ...(dependencies.healthRequireSession
        ? { requireSession: dependencies.healthRequireSession }
        : {}),
    }),
  );
  app.use("/api/upts", createUptRouter());
  app.use("/api/users", createUserRouter());
  app.use("/api/periods", createPeriodRouter());
  app.use("/api/reports", createReportRouter({ storage }));
  app.use("/api/attachments", createAttachmentRouter({ storage }));
  app.use("/api/dashboard", createDashboardRouter());
  app.use("/api/exports", createExportRouter());
  app.use("/api/audit", createAuditRouter());
  const audit = createAuditRepository(prisma);
  app.use("/api/indicators", createIndicatorMutationRouter(createIndicatorService(prisma, audit)));
  app.use("/api/documents", createDocumentMutationRouter(createDocumentService(prisma, audit)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
