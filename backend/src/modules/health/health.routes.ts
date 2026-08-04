import { Router } from "express";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../middleware/error.js";
import { checkDatabase, type DatabaseReadinessClient } from "../../services/readiness.service.js";

export function createHealthRouter(database: DatabaseReadinessClient = prisma): Router {
  const router = Router();

  router.get("/live", (_request, response) => {
    response.status(200).json({
      data: { status: "ok" },
      meta: {},
    });
  });

  router.get("/ready", async (_request, response, next) => {
    try {
      await checkDatabase(database);
      response.status(200).json({
        data: { status: "ready", dependencies: { database: "ready" } },
        meta: {},
      });
    } catch {
      next(new AppError(503, "DATABASE_UNAVAILABLE", "Dependency database belum siap."));
    }
  });

  return router;
}
