import {
  PrismaClient,
  Prisma,
  type ApprovalStatus,
  type Indicator,
  type PeriodStatus,
} from "@prisma/client";

type IndicatorData = {
  code?: string;
  name?: string;
  required?: boolean;
  order?: number;
  inputConfig?: Record<string, unknown>;
};
export interface IndicatorRepository {
  list(periodId: string): Promise<Indicator[]>;
  findById(id: string): Promise<(Indicator & { period: { status: PeriodStatus } }) | null>;
  period(id: string): Promise<{ id: string; status: PeriodStatus } | null>;
  create(data: {
    periodId: string;
    code: string;
    name: string;
    required: boolean;
    order: number;
    inputConfig: Record<string, unknown>;
  }): Promise<Indicator>;
  update(id: string, data: IndicatorData): Promise<Indicator>;
  approve(id: string, status: ApprovalStatus, actorId: string, reason?: string): Promise<Indicator>;
}

export function createIndicatorRepository(database: PrismaClient): IndicatorRepository {
  return {
    list: (periodId) =>
      database.indicator.findMany({ where: { periodId }, orderBy: { order: "asc" } }),
    findById: (id) =>
      database.indicator.findUnique({
        where: { id },
        include: { period: { select: { status: true } } },
      }),
    period: (id) =>
      database.reportingPeriod.findUnique({ where: { id }, select: { id: true, status: true } }),
    create: (data) =>
      database.indicator.create({
        data: { ...data, inputConfig: data.inputConfig as Prisma.InputJsonValue },
      }),
    update: (id, data) =>
      database.indicator.update({
        where: { id },
        data: {
          ...(data.code === undefined ? {} : { code: data.code }),
          ...(data.name === undefined ? {} : { name: data.name }),
          ...(data.required === undefined ? {} : { required: data.required }),
          ...(data.order === undefined ? {} : { order: data.order }),
          ...(data.inputConfig === undefined
            ? {}
            : { inputConfig: data.inputConfig as Prisma.InputJsonValue }),
        },
      }),
    approve: (id, status, actorId, reason) =>
      database.indicator.update({
        where: { id },
        data: {
          approvalStatus: status,
          approvedById: actorId,
          approvedAt: new Date(),
          rejectionReason: reason ?? null,
        },
      }),
  };
}
