import type { Request } from "express";
import type { Role } from "@simpatik/contracts";

import type { AuthSession } from "../modules/auth/auth.js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  uptId: string | null;
  active: boolean;
}

export interface AuthContext {
  session: AuthSession;
  user: AuthUser;
}

export type AuthRequest = Request & {
  auth?: AuthContext;
  uptScopeId?: string;
};
