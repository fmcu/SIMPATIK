import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

export function requestId(request: Request, response: Response, next: NextFunction): void {
  const incomingId = request.header("x-request-id");
  const id = incomingId && incomingId.length <= 128 ? incomingId : randomUUID();
  response.locals.requestId = id;
  response.setHeader("x-request-id", id);
  next();
}
