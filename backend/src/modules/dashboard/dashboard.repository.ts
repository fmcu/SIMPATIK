import { Prisma, PrismaClient, type ReportStatus } from "@prisma/client";

export type DashboardFilters = {
  periodId?: string;
  uptId?: string;
  status?: ReportStatus;
  reportType?: string;
};

const reportSelect = Prisma.validator<Prisma.ReportSelect>()({
  id: true,
  uptId: true,
  periodId: true,
  reportType: true,
  status: true,
  updatedAt: true,
  submittedAt: true,
  upt: { select: { id: true, code: true, name: true } },
  period: { select: { id: true, name: true, startDate: true, dueDate: true } },
  items: { select: { value: true, narrative: true } },
});

export type DashboardReport = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;
export type DashboardPeriod = {
  id: string;
  name: string;
  startDate: Date;
  dueDate: Date;
};

export interface DashboardRepository {
  findPeriod(id?: string): Promise<DashboardPeriod | null>;
  summarize(filters: DashboardFilters): Promise<Record<ReportStatus, number>>;
  listByUpt(
    filters: DashboardFilters,
    pagination: { skip: number; take: number },
  ): Promise<{
    items: Array<{
      id: string;
      code: string;
      name: string;
      reports: Array<{
        id: string;
        reportType: string;
        status: ReportStatus;
        updatedAt: Date;
        submittedAt: Date | null;
      }>;
    }>;
    total: number;
  }>;
  listReports(filters: DashboardFilters): Promise<DashboardReport[]>;
}

function reportWhere(filters: DashboardFilters): Prisma.ReportWhereInput {
  return {
    ...(filters.periodId ? { periodId: filters.periodId } : {}),
    ...(filters.uptId ? { uptId: filters.uptId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.reportType ? { reportType: filters.reportType } : {}),
  };
}

const emptyCounts = (): Record<ReportStatus, number> => ({
  DRAFT: 0,
  SUBMITTED: 0,
  REVISION_REQUIRED: 0,
  REVIEWED: 0,
  APPROVED: 0,
});

export function createDashboardRepository(database: PrismaClient): DashboardRepository {
  return {
    findPeriod: (id) =>
      id
        ? database.reportingPeriod.findUnique({
            where: { id },
            select: { id: true, name: true, startDate: true, dueDate: true },
          })
        : database.reportingPeriod.findFirst({
            where: { status: "ACTIVE" },
            orderBy: { startDate: "desc" },
            select: { id: true, name: true, startDate: true, dueDate: true },
          }),
    async summarize(filters) {
      const grouped = await database.report.groupBy({
        by: ["status"],
        where: reportWhere(filters),
        _count: { _all: true },
      });
      const counts = emptyCounts();
      grouped.forEach((item) => {
        counts[item.status] = item._count._all;
      });
      return counts;
    },
    async listByUpt(filters, pagination) {
      const where = { active: true, ...(filters.uptId ? { id: filters.uptId } : {}) };
      const [items, total] = await Promise.all([
        database.uPT.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { code: "asc" },
          select: {
            id: true,
            code: true,
            name: true,
            reports: {
              where: reportWhere(filters),
              orderBy: { updatedAt: "desc" },
              take: 1,
              select: {
                id: true,
                reportType: true,
                status: true,
                updatedAt: true,
                submittedAt: true,
              },
            },
          },
        }),
        database.uPT.count({ where }),
      ]);
      return { items, total };
    },
    listReports: (filters) =>
      database.report.findMany({
        where: reportWhere(filters),
        take: 1_000,
        orderBy: [
          { period: { startDate: "desc" } },
          { upt: { code: "asc" } },
          { updatedAt: "desc" },
        ],
        select: reportSelect,
      }),
  };
}

export { reportWhere };
