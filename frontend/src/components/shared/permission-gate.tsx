import type { ReactNode } from "react";

export interface PermissionGateProps {
  allowed: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ allowed, children, fallback = null }: PermissionGateProps) {
  return allowed ? children : fallback;
}
