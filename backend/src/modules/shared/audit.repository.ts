import { PrismaClient } from "@prisma/client";

import { AuditLogService, type AuditLogInput } from "./audit.service.js";

export interface AuditRepository {
  write(data: AuditLogInput): Promise<void>;
}

export function createAuditRepository(database: PrismaClient): AuditRepository {
  const service = new AuditLogService(database);
  return {
    write: (data) => service.record(data),
  };
}
