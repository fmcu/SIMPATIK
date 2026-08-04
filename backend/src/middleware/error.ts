import type { NextFunction, Request, Response } from "express";

import type { ApiErrorCode, ApiFieldError } from "@simpatik/contracts";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly fields: ApiFieldError[];

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    fields: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export function notFoundHandler(request: Request, _response: Response, next: NextFunction): void {
  next(new AppError(404, "NOT_FOUND", `Rute ${request.method} ${request.path} tidak ditemukan.`));
}
