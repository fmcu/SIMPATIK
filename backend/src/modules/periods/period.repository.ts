import { PrismaClient, type PeriodStatus, type ReportingPeriod } from "@prisma/client";

type PeriodData = {
  name?: string | undefined;
  startDate?: Date | undefined;
  dueDate?: Date | undefined;
  status?: PeriodStatus | undefined;
};
export interface PeriodRepository {
  list(args: {
    skip: number;
    take: number;
    status?: PeriodStatus | undefined;
    search?: string | undefined;
  }): Promise<{ items: ReportingPeriod[]; total: number }>;
  findById(
    id: string,
  ): Promise<(ReportingPeriod & { indicators: unknown[]; requiredDocuments: unknown[] }) | null>;
  create(data: {
    name: string;
    startDate: Date;
    dueDate: Date;
    status: PeriodStatus;
  }): Promise<ReportingPeriod>;
  update(id: string, data: PeriodData): Promise<ReportingPeriod>;
  countActive(excludeId?: string): Promise<number>;
}

export function createPeriodRepository(
  database: PrismaClient = new PrismaClient(),
): PeriodRepository {
  return {
    async list({ skip, take, status, search }) {
      const where = {
        ...(status ? { status } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      };
      const [items, total] = await Promise.all([
        database.reportingPeriod.findMany({ where, skip, take, orderBy: { startDate: "desc" } }),
        database.reportingPeriod.count({ where }),
      ]);
      return { items, total };
    },
    findById: (id) =>
      database.reportingPeriod.findUnique({
        where: { id },
        include: {
          indicators: {
            orderBy: { order: "asc" },
            include: { requiredDocuments: { orderBy: { order: "asc" } } },
          },
          requiredDocuments: { orderBy: { order: "asc" } },
        },
      }),
    create: (data) => database.reportingPeriod.create({ data }),
    update: (id, data) =>
      database.reportingPeriod.update({
        where: { id },
        data: {
          ...(data.name === undefined ? {} : { name: data.name }),
          ...(data.startDate === undefined ? {} : { startDate: data.startDate }),
          ...(data.dueDate === undefined ? {} : { dueDate: data.dueDate }),
          ...(data.status === undefined ? {} : { status: data.status }),
        },
      }),
    countActive: (excludeId) =>
      database.reportingPeriod.count({
        where: { status: "ACTIVE", ...(excludeId ? { id: { not: excludeId } } : {}) },
      }),
  };
}
