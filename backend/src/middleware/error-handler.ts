import type { ErrorRequestHandler } from "express";

import type { ApiErrorCode } from "@simpatik/contracts";

import { AppError } from "./error.js";
import { writeLog } from "./logger.js";

const statusToCode: Record<number, ApiErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "REQUEST_TOO_LARGE",
  429: "RATE_LIMITED",
};

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void next;
  const isAppError = error instanceof AppError;
  const isRequestTooLarge = !isAppError && error?.type === "entity.too.large";
  const isInvalidJson = !isAppError && error?.type === "entity.parse.failed";
  const statusCode = isAppError ? error.statusCode : isRequestTooLarge ? 413 : isInvalidJson ? 400 : 500;
  const code = isAppError
    ? error.code
    : (statusToCode[statusCode] ?? "INTERNAL_ERROR");
  const message = isAppError
    ? error.message
    : isRequestTooLarge
      ? "Ukuran request melebihi batas yang diizinkan."
      : isInvalidJson
        ? "Format JSON tidak valid."
        : "Terjadi kesalahan internal.";
  const fields = isAppError ? error.fields : [];

  if (!isAppError) {
    writeLog("error", "unhandled_error", {
      requestId: response.locals.requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      method: request.method,
      path: request.path,
    });
  }

  response.status(statusCode).json({
    error: {
      code,
      message,
      fields,
    },
    meta: { requestId: response.locals.requestId },
  });
};
