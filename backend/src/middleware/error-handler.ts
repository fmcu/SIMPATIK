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
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next;
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const code = isAppError ? error.code : (statusToCode[statusCode] ?? "INTERNAL_ERROR");
  const message = isAppError ? error.message : "Terjadi kesalahan internal.";
  const fields = isAppError ? error.fields : [];

  if (!isAppError) {
    writeLog("error", "unhandled_error", {
      requestId: response.locals.requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }

  response.status(statusCode).json({
    error: {
      code,
      message,
      fields,
    },
  });
};
