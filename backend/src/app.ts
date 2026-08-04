import cors from "cors";
import express from "express";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";

import { environment } from "./config/environment.js";
import { auth } from "./modules/auth/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/error.js";
import { logger } from "./middleware/logger.js";
import { requestId } from "./middleware/request-id.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import type { DatabaseReadinessClient } from "./services/readiness.service.js";
import { createUptRouter } from "./modules/upts/upt.routes.js";
import { createUserRouter } from "./modules/users/user.routes.js";
import { createPeriodRouter } from "./modules/periods/period.routes.js";
import { createIndicatorMutationRouter } from "./modules/indicators/indicator.routes.js";
import { createDocumentMutationRouter } from "./modules/documents/document.routes.js";
import { createIndicatorService } from "./modules/indicators/indicator.routes.js";
import { createDocumentService } from "./modules/documents/document.routes.js";
import { createReportRouter } from "./modules/reports/report.routes.js";
import { createAttachmentRouter } from "./modules/attachments/attachment.routes.js";
import { createAuditRepository } from "./modules/shared/audit.repository.js";
import { prisma } from "./config/prisma.js";

export function createApp(database?: DatabaseReadinessClient): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || environment.trustedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin tidak diizinkan."));
      },
    }),
  );
  app.use(requestId);
  app.use(logger);
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", createHealthRouter(database));
  app.use("/api/upts", createUptRouter());
  app.use("/api/users", createUserRouter());
  app.use("/api/periods", createPeriodRouter());
  app.use("/api/reports", createReportRouter());
  app.use("/api/attachments", createAttachmentRouter());
  const audit = createAuditRepository(prisma);
  app.use("/api/indicators", createIndicatorMutationRouter(createIndicatorService(prisma, audit)));
  app.use("/api/documents", createDocumentMutationRouter(createDocumentService(prisma, audit)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
