import { Prisma, PrismaClient } from "@prisma/client";

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

const attachmentPrivateSelect = Prisma.validator<Prisma.AttachmentSelect>()({
  ...attachmentSelect,
  storageKey: true,
  report: { select: { id: true, status: true } },
});

export type AttachmentRecord = Prisma.AttachmentGetPayload<{ select: typeof attachmentSelect }>;
export type PrivateAttachmentRecord = Prisma.AttachmentGetPayload<{
  select: typeof attachmentPrivateSelect;
}>;

type UploadReport = {
  id: string;
  periodId: string;
  status: "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "REVIEWED" | "APPROVED";
  items: Array<{ id: string; indicatorId: string }>;
};

type Requirement = {
  periodId: string | null;
  indicatorId: string | null;
  maxSize: number;
  allowedMimeTypes: string[];
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  indicator: { periodId: string } | null;
};

export interface AttachmentRepository {
  findReportForUpload(id: string, uptScopeId: string): Promise<UploadReport | null>;
  findRequirement(id: string): Promise<Requirement | null>;
  create(data: {
    reportId: string;
    reportItemId?: string;
    requirementId?: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedById: string;
  }): Promise<AttachmentRecord>;
  findById(id: string, uptScopeId?: string): Promise<PrivateAttachmentRecord | null>;
  delete(id: string, reportId: string, actorId: string): Promise<boolean>;
}

export function createAttachmentRepository(database: PrismaClient): AttachmentRepository {
  return {
    findReportForUpload: (id, uptScopeId) =>
      database.report.findFirst({
        where: { id, uptId: uptScopeId },
        select: {
          id: true,
          periodId: true,
          status: true,
          items: { select: { id: true, indicatorId: true } },
        },
      }),
    findRequirement: (id) =>
      database.requiredDocument.findUnique({
        where: { id },
        select: {
          periodId: true,
          indicatorId: true,
          maxSize: true,
          allowedMimeTypes: true,
          approvalStatus: true,
          indicator: { select: { periodId: true } },
        },
      }),
    create: (data) =>
      database.$transaction(async (transaction) => {
        const attachment = await transaction.attachment.create({
          data: {
            reportId: data.reportId,
            ...(data.reportItemId === undefined ? {} : { reportItemId: data.reportItemId }),
            ...(data.requirementId === undefined ? {} : { requirementId: data.requirementId }),
            storageKey: data.storageKey,
            originalName: data.originalName,
            mimeType: data.mimeType,
            size: data.size,
            uploadedById: data.uploadedById,
          },
          select: attachmentSelect,
        });
        await transaction.auditLog.create({
          data: {
            actorId: data.uploadedById,
            action: "ATTACHMENT_UPLOADED",
            entityType: "Attachment",
            entityId: attachment.id,
            metadata: {
              reportId: data.reportId,
              reportItemId: data.reportItemId,
              requirementId: data.requirementId,
              mimeType: data.mimeType,
              size: data.size,
            },
          },
        });
        return attachment;
      }),
    findById: (id, uptScopeId) =>
      database.attachment.findFirst({
        where: { id, ...(uptScopeId ? { report: { uptId: uptScopeId } } : {}) },
        select: attachmentPrivateSelect,
      }),
    delete: (id, reportId, actorId) =>
      database.$transaction(async (transaction) => {
        const removed = await transaction.attachment.deleteMany({
          where: { id, reportId, report: { status: { in: ["DRAFT", "REVISION_REQUIRED"] } } },
        });
        if (removed.count !== 1) return false;
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "ATTACHMENT_DELETED",
            entityType: "Attachment",
            entityId: id,
            metadata: { reportId },
          },
        });
        return true;
      }),
  };
}
