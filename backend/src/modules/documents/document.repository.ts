import {
  PrismaClient,
  type ApprovalStatus,
  type PeriodStatus,
  type RequiredDocument,
} from "@prisma/client";

import type { RequiredDocumentRequirement } from "./document.validation.js";

type DocumentData = {
  code?: string | undefined;
  name?: string | undefined;
  required?: boolean | undefined;
  allowedMimeTypes?: string[] | undefined;
  maxSize?: number | undefined;
  order?: number | undefined;
};
export interface DocumentRepository {
  list(scope: {
    periodId?: string | undefined;
    indicatorId?: string | undefined;
  }): Promise<RequiredDocument[]>;
  findById(id: string): Promise<
    | (RequiredDocument & {
        period: { status: PeriodStatus } | null;
        indicator: { period: { status: PeriodStatus } } | null;
      })
    | null
  >;
  period(id: string): Promise<{ id: string; status: PeriodStatus } | null>;
  indicator(
    id: string,
  ): Promise<{ id: string; period: { id: string; status: PeriodStatus } } | null>;
  create(data: {
    periodId?: string | undefined;
    indicatorId?: string | undefined;
    code: string;
    name: string;
    required: boolean;
    allowedMimeTypes: string[];
    maxSize: number;
    order: number;
  }): Promise<RequiredDocument>;
  update(id: string, data: DocumentData): Promise<RequiredDocument>;
  approve(
    id: string,
    status: ApprovalStatus,
    actorId: string,
    reason?: string,
  ): Promise<RequiredDocument>;
  requiredForReport(periodId: string): Promise<RequiredDocumentRequirement[]>;
  attachmentRequirementIds(reportId: string): Promise<string[]>;
}

export function createDocumentRepository(database: PrismaClient): DocumentRepository {
  return {
    list: (scope) =>
      database.requiredDocument.findMany({
        where:
          scope.periodId === undefined
            ? scope.indicatorId === undefined
              ? {}
              : { indicatorId: scope.indicatorId }
            : { OR: [{ periodId: scope.periodId }, { indicator: { periodId: scope.periodId } }] },
        orderBy: { order: "asc" },
      }),
    findById: (id) =>
      database.requiredDocument.findUnique({
        where: { id },
        include: {
          period: { select: { status: true } },
          indicator: { select: { period: { select: { status: true } } } },
        },
      }),
    period: (id) =>
      database.reportingPeriod.findUnique({ where: { id }, select: { id: true, status: true } }),
    indicator: (id) =>
      database.indicator.findUnique({
        where: { id },
        select: { id: true, period: { select: { id: true, status: true } } },
      }),
    create: (data) =>
      database.requiredDocument.create({
        data: {
          code: data.code,
          name: data.name,
          required: data.required,
          allowedMimeTypes: data.allowedMimeTypes,
          maxSize: data.maxSize,
          order: data.order,
          ...(data.periodId === undefined ? {} : { periodId: data.periodId }),
          ...(data.indicatorId === undefined ? {} : { indicatorId: data.indicatorId }),
        },
      }),
    update: (id, data) =>
      database.requiredDocument.update({
        where: { id },
        data: {
          ...(data.code === undefined ? {} : { code: data.code }),
          ...(data.name === undefined ? {} : { name: data.name }),
          ...(data.required === undefined ? {} : { required: data.required }),
          ...(data.allowedMimeTypes === undefined
            ? {}
            : { allowedMimeTypes: data.allowedMimeTypes }),
          ...(data.maxSize === undefined ? {} : { maxSize: data.maxSize }),
          ...(data.order === undefined ? {} : { order: data.order }),
        },
      }),
    approve: (id, status, actorId, reason) =>
      database.requiredDocument.update({
        where: { id },
        data: {
          approvalStatus: status,
          approvedById: actorId,
          approvedAt: new Date(),
          rejectionReason: reason ?? null,
        },
      }),
    requiredForReport: async (periodId) =>
      database.requiredDocument.findMany({
        where: {
          required: true,
          approvalStatus: "APPROVED",
          OR: [{ periodId }, { indicator: { periodId } }],
        },
        select: { id: true, code: true, name: true },
        orderBy: { order: "asc" },
      }),
    attachmentRequirementIds: async (reportId) => {
      const attachments = await database.attachment.findMany({
        where: { reportId, requirementId: { not: null } },
        select: { requirementId: true },
      });
      return attachments.flatMap((attachment) =>
        attachment.requirementId === null ? [] : [attachment.requirementId],
      );
    },
  };
}
