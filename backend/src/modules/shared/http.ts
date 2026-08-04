import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";
import { Prisma } from "@prisma/client";
import type { ApiFieldError } from "@simpatik/contracts";

import { AppError } from "../../middleware/error.js";

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => unknown,
): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch((error: unknown) =>
      next(toAppError(error)),
    );
  };
}

export function validate(schema: ZodTypeAny, source: "body" | "query" | "params"): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      const fields: ApiFieldError[] = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message,
      }));
      next(new AppError(400, "VALIDATION_ERROR", "Data request tidak valid.", fields));
      return;
    }
    request[source] = result.data;
    next();
  };
}

export function toAppError(error: unknown): unknown {
  if (error instanceof AppError) return error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return new AppError(409, "CONFLICT", "Data sudah digunakan.");
    if (error.code === "P2025") return new AppError(404, "NOT_FOUND", "Data tidak ditemukan.");
  }
  return error;
}

export function sendData(
  response: Response,
  data: unknown,
  meta: Record<string, unknown> = {},
): void {
  response.json({ data, meta });
}

export function paginationMeta(
  page: number,
  pageSize: number,
  total: number,
): Record<string, unknown> {
  return { pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export function parseDate(value: Date): string {
  return value.toISOString();
}

export function routeParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string")
    throw new AppError(400, "VALIDATION_ERROR", "Parameter rute tidak valid.");
  return value;
}
