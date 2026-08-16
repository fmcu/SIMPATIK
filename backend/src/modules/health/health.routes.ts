import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import { AppError } from "../../middleware/error.js";
import {
  checkDatabase,
  checkStorage,
  type DatabaseReadinessClient,
  type StorageReadinessClient,
} from "../../services/readiness.service.js";

const HEALTH_DEADLINE_MS = 8_000;
const HEALTH_WINDOW_MS = 60 * 1_000;
const HEALTH_RATE_LIMIT = 120;

const rateLimitHandler: RequestHandler = (_request, response) => {
  response.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message: "Terlalu banyak permintaan kesehatan. Coba lagi beberapa saat lagi.",
      fields: [],
    },
  });
};

type HealthRouteDependencies = {
  database: DatabaseReadinessClient;
  storage: StorageReadinessClient;
  requireSession?: RequestHandler;
  deadlineMs?: number;
};

function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new AppError(503, "DEPENDENCY_TIMEOUT", "Pemeriksaan dependensi melebihi batas waktu."),
      );
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function resolveWhenRequestClosed(request: Request): Promise<void> {
  return new Promise((resolve) => {
    if (request.destroyed) {
      resolve();
      return;
    }
    request.once("aborted", () => resolve());
    request.once("close", () => resolve());
  });
}

export function createHealthRouter(dependencies: HealthRouteDependencies): Router {
  const router = Router();
  const session = dependencies.requireSession ?? requireHealthSession;
  const deadlineMs = dependencies.deadlineMs ?? HEALTH_DEADLINE_MS;

  router.use(
    rateLimit({
      windowMs: HEALTH_WINDOW_MS,
      limit: HEALTH_RATE_LIMIT,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      handler: rateLimitHandler,
    }),
  );

  router.get("/live", session, (_request, response) => {
    response.status(200).json({
      data: { status: "ok" },
      meta: {},
    });
  });

  router.get("/ready", session, async (request, response, next) => {
    const checks = Promise.allSettled([
      withDeadline(checkDatabase(dependencies.database), deadlineMs),
      withDeadline(checkStorage(dependencies.storage), deadlineMs),
    ]);
    const results = await Promise.race([
      checks,
      resolveWhenRequestClosed(request).then(() => null),
    ]);
    if (results === null) return;

    const [databaseResult, storageResult] = results;
    if (databaseResult.status === "rejected") {
      next(
        databaseResult.reason instanceof AppError
          ? databaseResult.reason
          : new AppError(503, "DATABASE_UNAVAILABLE", "Dependency database belum siap."),
      );
      return;
    }
    if (storageResult.status === "rejected") {
      next(
        storageResult.reason instanceof AppError
          ? storageResult.reason
          : new AppError(503, "STORAGE_UNAVAILABLE", "Penyimpanan file privat belum siap."),
      );
      return;
    }

    response.status(200).json({
      data: {
        status: "ready",
        dependencies: { database: "ready", storage: "ready" },
      },
      meta: {},
    });
  });

  return router;
}

export function requireHealthSession(
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  next(new AppError(401, "AUTHENTICATION_REQUIRED", "Sesi login diperlukan."));
}
