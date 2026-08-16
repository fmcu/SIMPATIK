import type { Prisma } from "@prisma/client";

export type AuditLogListArgs = {
  skip: number;
  take: number;
  action?: string;
  entityType?: string;
  search?: string;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: Date;
  actor: { id: string; name: string; email: string } | null;
};

export interface AuditLogReader {
  list(args: AuditLogListArgs): Promise<{ items: AuditLogEntry[]; total: number }>;
}

type AuditLogDatabase = {
  auditLog: {
    findMany(args: Prisma.AuditLogFindManyArgs): PromiseLike<unknown>;
    count(args: Prisma.AuditLogCountArgs): PromiseLike<number>;
  };
};

export function createAuditLogReader(database: AuditLogDatabase): AuditLogReader {
  return {
    async list({ skip, take, action, entityType, search }) {
      const where = {
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
        ...(search
          ? {
              OR: [
                { actor: { name: { contains: search, mode: "insensitive" as const } } },
                { actor: { email: { contains: search, mode: "insensitive" as const } } },
                { entityId: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const select = {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      } as const;
      const [items, total] = await Promise.all([
        database.auditLog.findMany({
          where,
          skip,
          take,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select,
        }),
        database.auditLog.count({ where }),
      ]);
      return { items: items as AuditLogEntry[], total };
    },
  };
}
