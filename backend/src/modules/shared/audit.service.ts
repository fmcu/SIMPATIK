import { Prisma, PrismaClient } from "@prisma/client";

const blockedKeyFragments = [
  "authorization",
  "body",
  "cookie",
  "content",
  "file",
  "password",
  "secret",
  "storagekey",
  "token",
];

export type AuditLogInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export function sanitizeAuditMetadata(
  value: unknown,
  key?: string,
): Prisma.InputJsonValue | undefined {
  if (key && blockedKeyFragments.some((fragment) => key.toLowerCase().includes(fragment)))
    return undefined;
  if (value === null) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeAuditMetadata(item))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined);
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .map(
        ([entryKey, entryValue]) =>
          [entryKey, sanitizeAuditMetadata(entryValue, entryKey)] as const,
      )
      .filter((entry): entry is readonly [string, Prisma.InputJsonValue] => entry[1] !== undefined);
    return Object.fromEntries(entries) as Prisma.InputJsonObject;
  }
  return undefined;
}

export class AuditLogService {
  constructor(private readonly database: PrismaClient) {}

  async record(data: AuditLogInput): Promise<void> {
    const metadata = data.metadata === undefined ? undefined : sanitizeAuditMetadata(data.metadata);
    await this.database.auditLog.create({
      data: {
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        ...(data.entityId === undefined ? {} : { entityId: data.entityId }),
        ...(metadata === undefined ? {} : { metadata }),
      },
    });
  }
}
