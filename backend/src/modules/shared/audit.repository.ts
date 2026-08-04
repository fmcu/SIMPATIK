import { PrismaClient, Prisma } from "@prisma/client";

export interface AuditRepository {
  write(data: {
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export function createAuditRepository(database: PrismaClient): AuditRepository {
  return {
    async write(data) {
      const metadata =
        data.metadata === undefined
          ? undefined
          : Object.fromEntries(
              Object.entries(data.metadata).filter(([, value]) => value !== undefined),
            );
      await database.auditLog.create({
        data: {
          actorId: data.actorId,
          action: data.action,
          entityType: data.entityType,
          ...(data.entityId === undefined ? {} : { entityId: data.entityId }),
          ...(metadata === undefined ? {} : { metadata: metadata as Prisma.InputJsonValue }),
        },
      });
    },
  };
}
