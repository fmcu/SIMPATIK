import type { NextFunction, Request, Response } from "express";

function writeLog(
  level: "info" | "warn" | "error",
  message: string,
  fields: Record<string, unknown>,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  };

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export function logger(request: Request, response: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    writeLog("info", "http_request", {
      requestId: response.locals.requestId,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  next();
}

export { writeLog };
