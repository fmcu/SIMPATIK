import { Prisma, PrismaClient, type ReportStatus } from "@prisma/client";

import type { ReportCreateInput, ReportItemUpdateInput } from "./report.types.js";

const reportListSelect = Prisma.validator<Prisma.ReportSelect>()({
  id: true,
  uptId: true,
  periodId: true,
  reportType: true,
  status: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  upt: { select: { id: true, code: true, name: true } },
  period: { select: { id: true, name: true, startDate: true, dueDate: true, status: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { items: true } },
});

const attachmentSelect = Prisma.validator<Prisma.AttachmentSelect>()({
  id: true,
  reportItemId: true,
  requirementId: true,
  originalName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } },
  requirement: { select: { id: true, code: true, name: true } },
});

const reportDetailSelect = Prisma.validator<Prisma.ReportSelect>()({
  ...reportListSelect,
  reviewedAt: true,
  approvedAt: true,
  reviewedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },

  items: {
    orderBy: { indicator: { order: "asc" } },
    select: {
      id: true,
      indicatorId: true,
      value: true,
      narrative: true,
      indicator: {
        select: {
          id: true,
          periodId: true,
          code: true,
          name: true,
          required: true,
          order: true,
          inputConfig: true,
          approvalStatus: true,
        },
      },
    },
  },
  attachments: { orderBy: { createdAt: "asc" }, select: attachmentSelect },
  comments: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      message: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  },
  histories: {
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  },
});

export type ReportListItem = Prisma.ReportGetPayload<{ select: typeof reportListSelect }>;
export type ReportDetail = Prisma.ReportGetPayload<{ select: typeof reportDetailSelect }>;

type CreationContext = {
  period: {
    id: string;
    status: "DRAFT" | "ACTIVE" | "CLOSED";
    indicators: { id: string }[];
  } | null;
  upt: { id: string } | null;
};

export interface ReportRepository {
  list(input: {
    skip: number;
    take: number;
    periodId?: string | undefined;
    uptId?: string | undefined;
    status?: ReportStatus | undefined;
    uptScopeId?: string | undefined;
  }): Promise<{ items: ReportListItem[]; total: number }>;
  findById(id: string, uptScopeId?: string): Promise<ReportDetail | null>;
  history(
    id: string,
    uptScopeId: string | undefined,
    pagination: { skip: number; take: number },
  ): Promise<{
    items: Array<{
      id: string;
      fromStatus: ReportStatus | null;
      toStatus: ReportStatus;
      note: string | null;
      createdAt: Date;
      actor: { id: string; name: string };
    }>;
    total: number;
  }>;
  findCreationContext(periodId: string, uptId: string): Promise<CreationContext>;
  exists(uptId: string, periodId: string, reportType: string): Promise<boolean>;
  createDraft(input: ReportCreateInput & { indicatorIds: string[] }): Promise<ReportDetail>;
  updateDraft(input: {
    id: string;
    uptScopeId: string;
    version: number;
    items: ReportItemUpdateInput[];
    actorId: string;
  }): Promise<ReportDetail | null>;
  submit(input: {
    id: string;
    uptScopeId: string;
    actorId: string;
    validate: (report: ReportDetail) => Promise<void>;
  }): Promise<ReportDetail | "NOT_FOUND" | "INVALID_STATUS">;
  addReviewComment(input: {
    id: string;
    actorId: string;
    message: string;
  }): Promise<ReportDetail | "NOT_FOUND" | "INVALID_STATUS">;
  requestRevision(input: {
    id: string;
    actorId: string;
    message: string;
  }): Promise<ReportDetail | "NOT_FOUND" | "INVALID_STATUS">;
   markReviewed(input: {
     id: string;
     actorId: string;
   }): Promise<ReportDetail | "NOT_FOUND" | "INVALID_STATUS">;
   approve(input: {
     id: string;
     actorId: string;
   }): Promise<ReportDetail | "NOT_FOUND" | "INVALID_STATUS">;

}

function whereForScope(id: string, uptScopeId?: string): Prisma.ReportWhereInput {
  return { id, ...(uptScopeId ? { uptId: uptScopeId } : {}) };
}

export function createReportRepository(database: PrismaClient): ReportRepository {
  return {
    async list({ skip, take, periodId, uptId, status, uptScopeId }) {
      const where: Prisma.ReportWhereInput = {
        ...(periodId ? { periodId } : {}),
        ...(uptScopeId ? { uptId: uptScopeId } : uptId ? { uptId } : {}),
        ...(status ? { status } : {}),
      };
      const [items, total] = await Promise.all([
        database.report.findMany({
          where,
          skip,
          take,
          orderBy: { updatedAt: "desc" },
          select: reportListSelect,
        }),
        database.report.count({ where }),
      ]);
      return { items, total };
    },
    findById: (id, uptScopeId) =>
      database.report.findFirst({
        where: whereForScope(id, uptScopeId),
        select: reportDetailSelect,
      }),
    async history(id, uptScopeId, pagination) {
      const where = { reportId: id, ...(uptScopeId ? { report: { uptId: uptScopeId } } : {}) };
      const [items, total] = await Promise.all([
        database.statusHistory.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
            actor: { select: { id: true, name: true } },
          },
        }),
        database.statusHistory.count({ where }),
      ]);
      return { items, total };
    },
    async findCreationContext(periodId, uptId) {
      const [period, upt] = await Promise.all([
        database.reportingPeriod.findUnique({
          where: { id: periodId },
          select: {
            id: true,
            status: true,
            indicators: {
              where: { approvalStatus: "APPROVED" },
              orderBy: { order: "asc" },
              select: { id: true },
            },
          },
        }),
        database.uPT.findFirst({ where: { id: uptId, active: true }, select: { id: true } }),
      ]);
      return { period, upt };
    },
    async exists(uptId, periodId, reportType) {
      return Boolean(
        await database.report.findUnique({
          where: { uptId_periodId_reportType: { uptId, periodId, reportType } },
          select: { id: true },
        }),
      );
    },
    async createDraft({ periodId, reportType, uptId, actorId, indicatorIds }) {
      return database.$transaction(async (transaction) => {
        const report = await transaction.report.create({
          data: {
            periodId,
            reportType,
            uptId,
            createdById: actorId,
            items: { create: indicatorIds.map((indicatorId) => ({ indicatorId })) },
          },
          select: { id: true },
        });
        await transaction.statusHistory.create({
          data: { reportId: report.id, toStatus: "DRAFT", actorId },
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "REPORT_CREATED",
            entityType: "Report",
            entityId: report.id,
            metadata: { periodId, reportType, uptId },
          },
        });
        const detail = await transaction.report.findUnique({
          where: { id: report.id },
          select: reportDetailSelect,
        });
        if (!detail) throw new Error("Laporan yang baru dibuat tidak ditemukan.");
        return detail;
      });
    },
    async updateDraft({ id, uptScopeId, version, items, actorId }) {
      return database.$transaction(async (transaction) => {
        const updated = await transaction.report.updateMany({
          where: {
            id,
            uptId: uptScopeId,
            version,
            status: { in: ["DRAFT", "REVISION_REQUIRED"] },
          },
          data: { version: { increment: 1 } },
        });
        if (updated.count !== 1) return null;

        await Promise.all(
          items.map((item) =>
            transaction.reportItem.update({
              where: { reportId_indicatorId: { reportId: id, indicatorId: item.indicatorId } },
              data: {
                ...(item.value === undefined ? {} : { value: item.value }),
                ...(item.narrative === undefined ? {} : { narrative: item.narrative }),
              },
            }),
          ),
        );
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "REPORT_UPDATED",
            entityType: "Report",
            entityId: id,
            metadata: { updatedIndicatorIds: items.map((item) => item.indicatorId) },
          },
        });
        return transaction.report.findUnique({ where: { id }, select: reportDetailSelect });
      });
    },
    async submit({ id, uptScopeId, actorId, validate }) {
      return database.$transaction(async (transaction) => {
        const report = await transaction.report.findFirst({
          where: { id, uptId: uptScopeId },
          select: reportDetailSelect,
        });
        if (!report) return "NOT_FOUND";
        if (report.status !== "DRAFT" && report.status !== "REVISION_REQUIRED") {
          return "INVALID_STATUS";
        }
        await validate(report);
        const updated = await transaction.report.updateMany({
          where: { id, uptId: uptScopeId, status: { in: ["DRAFT", "REVISION_REQUIRED"] } },
          data: { status: "SUBMITTED", submittedAt: new Date() },
        });
        if (updated.count !== 1) return "INVALID_STATUS";

        await transaction.statusHistory.create({
          data: { reportId: id, fromStatus: report.status, toStatus: "SUBMITTED", actorId },
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "REPORT_SUBMITTED",
            entityType: "Report",
            entityId: id,
            metadata: { fromStatus: report.status, toStatus: "SUBMITTED", uptId: uptScopeId },
          },
        });
        const detail = await transaction.report.findUnique({
          where: { id },
          select: reportDetailSelect,
        });
        if (!detail) throw new Error("Laporan yang diajukan tidak ditemukan.");
        return detail;
      });
    },
    async addReviewComment({ id, actorId, message }) {
      return database.$transaction(async (transaction) => {
        const report = await transaction.report.findUnique({
          where: { id },
          select: { id: true, status: true },
        });
        if (!report) return "NOT_FOUND";
        if (report.status !== "SUBMITTED") return "INVALID_STATUS";

        await transaction.reviewComment.create({ data: { reportId: id, createdById: actorId, message } });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "REPORT_REVIEW_COMMENTED",
            entityType: "Report",
            entityId: id,
            metadata: { status: report.status },
          },
        });
        const detail = await transaction.report.findUnique({ where: { id }, select: reportDetailSelect });
        if (!detail) throw new Error("Laporan yang diberi catatan tidak ditemukan.");
        return detail;
      });
    },
    async requestRevision({ id, actorId, message }) {
      return database.$transaction(async (transaction) => {
        const report = await transaction.report.findUnique({
          where: { id },
          select: { id: true, status: true },
        });
        if (!report) return "NOT_FOUND";
        if (report.status !== "SUBMITTED") return "INVALID_STATUS";

        const updated = await transaction.report.updateMany({
          where: { id, status: "SUBMITTED" },
          data: { status: "REVISION_REQUIRED" },
        });
        if (updated.count !== 1) return "INVALID_STATUS";
        await transaction.reviewComment.create({ data: { reportId: id, createdById: actorId, message } });
        await transaction.statusHistory.create({
          data: {
            reportId: id,
            fromStatus: "SUBMITTED",
            toStatus: "REVISION_REQUIRED",
            actorId,
            note: message,
          },
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "REPORT_REVISION_REQUESTED",
            entityType: "Report",
            entityId: id,
            metadata: { fromStatus: "SUBMITTED", toStatus: "REVISION_REQUIRED" },
          },
        });
        const detail = await transaction.report.findUnique({ where: { id }, select: reportDetailSelect });
        if (!detail) throw new Error("Laporan yang dikembalikan tidak ditemukan.");
        return detail;
      });
    },
    async markReviewed({ id, actorId }) {
      return database.$transaction(async (transaction) => {
        const report = await transaction.report.findUnique({
          where: { id },
          select: { id: true, status: true },
        });
        if (!report) return "NOT_FOUND";
        if (report.status !== "SUBMITTED") return "INVALID_STATUS";

        const reviewedAt = new Date();
        const updated = await transaction.report.updateMany({
          where: { id, status: "SUBMITTED" },
          data: { status: "REVIEWED", reviewedById: actorId, reviewedAt },
        });
        if (updated.count !== 1) return "INVALID_STATUS";
        await transaction.statusHistory.create({
          data: { reportId: id, fromStatus: "SUBMITTED", toStatus: "REVIEWED", actorId },
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "REPORT_REVIEWED",
            entityType: "Report",
            entityId: id,
            metadata: { fromStatus: "SUBMITTED", toStatus: "REVIEWED", reviewedAt },
          },
        });
        const detail = await transaction.report.findUnique({ where: { id }, select: reportDetailSelect });
        if (!detail) throw new Error("Laporan yang direviu tidak ditemukan.");
        return detail;
      });
     },
     async approve({ id, actorId }) {
       return database.$transaction(async (transaction) => {
         const report = await transaction.report.findUnique({
           where: { id },
           select: { id: true, status: true },
         });
         if (!report) return "NOT_FOUND";
         if (report.status !== "REVIEWED") return "INVALID_STATUS";

         const approvedAt = new Date();
         const updated = await transaction.report.updateMany({
           where: { id, status: "REVIEWED" },
           data: { status: "APPROVED", approvedById: actorId, approvedAt },
         });
         if (updated.count !== 1) return "INVALID_STATUS";
         await transaction.statusHistory.create({
           data: { reportId: id, fromStatus: "REVIEWED", toStatus: "APPROVED", actorId },
         });
         await transaction.auditLog.create({
           data: {
             actorId,
             action: "REPORT_APPROVED",
             entityType: "Report",
             entityId: id,
             metadata: { fromStatus: "REVIEWED", toStatus: "APPROVED", approvedAt },
           },
         });
         const detail = await transaction.report.findUnique({ where: { id }, select: reportDetailSelect });
         if (!detail) throw new Error("Laporan yang disetujui tidak ditemukan.");
         return detail;
        });
      },
    };
  }
