import cors from "cors";
import express from "express";
import helmet from "helmet";

import { environment } from "./config/environment.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/error.js";
import { logger } from "./middleware/logger.js";
import { requestId } from "./middleware/request-id.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import type { DatabaseReadinessClient } from "./services/readiness.service.js";

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
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", createHealthRouter(database));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
