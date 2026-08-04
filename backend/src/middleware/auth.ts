import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { roleSchema, type Role } from "@simpatik/contracts";

import { auth } from "../modules/auth/auth.js";
import { AppError } from "./error.js";
import type { AuthContext, AuthRequest, AuthUser } from "./auth.types.js";

const uptRoles: readonly Role[] = ["PETUGAS_UPT", "KOORDINATOR_UPT"];

function getRequestedUptId(request: Request): string | undefined {
  const values = [
    request.params.uptId,
    typeof request.query.uptId === "string" ? request.query.uptId : undefined,
    typeof request.body?.uptId === "string" ? request.body.uptId : undefined,
  ];

  return values.find((value): value is string => Boolean(value));
}

function toAuthUser(user: AuthContext["session"]["user"]): AuthUser {
  const role = roleSchema.safeParse(user.role);
  if (!role.success || typeof user.active !== "boolean") {
    throw new AppError(500, "INTERNAL_ERROR", "Data pengguna tidak valid.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role.data,
    uptId: typeof user.uptId === "string" ? user.uptId : null,
    active: user.active,
  };
}

export function createRequireSession(
  getSession: typeof auth.api.getSession = auth.api.getSession,
): RequestHandler {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const session = await getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        next(new AppError(401, "AUTHENTICATION_REQUIRED", "Sesi login diperlukan."));
        return;
      }

      const user = toAuthUser(session.user);
      if (!user.active) {
        next(new AppError(401, "AUTHENTICATION_REQUIRED", "Sesi login diperlukan."));
        return;
      }

      (request as AuthRequest).auth = { session, user };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireSession: RequestHandler = createRequireSession();

export function requireRole(...roles: Role[]): RequestHandler {
  return (request, _response, next) => {
    const authRequest = request as AuthRequest;
    if (!authRequest.auth) {
      next(new AppError(401, "AUTHENTICATION_REQUIRED", "Sesi login diperlukan."));
      return;
    }

    if (!roles.includes(authRequest.auth.user.role)) {
      next(new AppError(403, "ROLE_NOT_ALLOWED", "Role tidak memiliki akses ke resource ini."));
      return;
    }

    next();
  };
}

export const enforceUptScope: RequestHandler = (request, _response, next) => {
  const authRequest = request as AuthRequest;
  if (!authRequest.auth) {
    next(new AppError(401, "AUTHENTICATION_REQUIRED", "Sesi login diperlukan."));
    return;
  }

  if (!uptRoles.includes(authRequest.auth.user.role)) {
    next();
    return;
  }

  const sessionUptId = authRequest.auth.user.uptId;
  if (!sessionUptId) {
    next(new AppError(403, "UPT_SCOPE_FORBIDDEN", "Akun belum memiliki penempatan UPT."));
    return;
  }

  const requestedUptId = getRequestedUptId(request);
  if (requestedUptId && requestedUptId !== sessionUptId) {
    next(new AppError(403, "UPT_SCOPE_FORBIDDEN", "Akses dibatasi pada UPT akun."));
    return;
  }

  authRequest.uptScopeId = sessionUptId;
  next();
};
