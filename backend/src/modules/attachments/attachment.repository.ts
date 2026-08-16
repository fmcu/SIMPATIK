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

export type AttachmentDeleteResult =
  { status: "DELETED"; cleanupTaskId: string } | { status: "NOT_DELETED" };

export type UploadCleanupTask = {
  id: string;
  storageKey: string;
};

export type UploadCleanupResolution =
  | { status: "CLEANUP_REQUIRED"; attempts: number; leaseUntil: Date }
  | { status: "METADATA_COMMITTED" }
  | { status: "DEFERRED" };

export interface AttachmentRepository {
  findReportForUpload(id: string, uptScopeId: string): Promise<UploadReport | null>;
  findRequirement(id: string): Promise<Requirement | null>;
  enqueueUploadCleanup(storageKey: string, nextAttemptAt: Date): Promise<UploadCleanupTask>;
  create(data: {
    reportId: string;
    reportItemId?: string;
    requirementId?: string;
    storageKey: string;
    cleanupTaskId: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedById: string;
  }): Promise<AttachmentRecord>;
  resolveUploadCleanup(task: UploadCleanupTask, leaseUntil: Date): Promise<UploadCleanupResolution>;
  completeUploadCleanup(
    task: UploadCleanupTask,
    claimedAttempts: number,
    leaseUntil: Date,
  ): Promise<boolean>;
  findById(id: string, uptScopeId?: string): Promise<PrivateAttachmentRecord | null>;
  delete(id: string, reportId: string, actorId: string): Promise<AttachmentDeleteResult>;
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
    enqueueUploadCleanup: (storageKey, nextAttemptAt) =>
      database.storageDeletionTask.create({
        data: { storageKey, nextAttemptAt, repeatUntilCancelled: true },
        select: { id: true, storageKey: true },
      }),
    create: (data) =>
      database.$transaction(async (transaction) => {
        const cancelledCleanup = await transaction.storageDeletionTask.deleteMany({
          where: {
            id: data.cleanupTaskId,
            storageKey: data.storageKey,
            attempts: 0,
            repeatUntilCancelled: true,
          },
        });
        if (cancelledCleanup.count !== 1) {
          throw new Error("Upload cleanup task was already claimed.");
        }

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
    resolveUploadCleanup: (task, leaseUntil) =>
      database.$transaction(async (transaction) => {
        const claimed = await transaction.storageDeletionTask.updateMany({
          where: {
            id: task.id,
            storageKey: task.storageKey,
            attempts: 0,
            repeatUntilCancelled: true,
          },
          data: { attempts: { increment: 1 }, nextAttemptAt: leaseUntil },
        });
        if (claimed.count === 1) {
          return { status: "CLEANUP_REQUIRED", attempts: 1, leaseUntil } as const;
        }

        const attachment = await transaction.attachment.findUnique({
          where: { storageKey: task.storageKey },
          select: { id: true },
        });
        return attachment
          ? ({ status: "METADATA_COMMITTED" } as const)
          : ({ status: "DEFERRED" } as const);
      }),
    completeUploadCleanup: async (task, claimedAttempts, leaseUntil) => {
      const completed = await database.storageDeletionTask.deleteMany({
        where: {
          id: task.id,
          storageKey: task.storageKey,
          attempts: claimedAttempts,
          nextAttemptAt: leaseUntil,
          repeatUntilCancelled: true,
        },
      });
      return completed.count === 1;
    },
    findById: (id, uptScopeId) =>
      database.attachment.findFirst({
        where: { id, ...(uptScopeId ? { report: { uptId: uptScopeId } } : {}) },
        select: attachmentPrivateSelect,
      }),
    delete: (id, reportId, actorId) =>
      database.$transaction(async (transaction) => {
        const attachment = await transaction.attachment.findFirst({
          where: { id, reportId, report: { status: { in: ["DRAFT", "REVISION_REQUIRED"] } } },
          select: { storageKey: true },
        });
        if (!attachment) return { status: "NOT_DELETED" } as const;

        const removed = await transaction.attachment.deleteMany({
          where: { id, reportId, report: { status: { in: ["DRAFT", "REVISION_REQUIRED"] } } },
        });
        if (removed.count !== 1) return { status: "NOT_DELETED" } as const;

        const cleanupTask = await transaction.storageDeletionTask.create({
          data: { storageKey: attachment.storageKey },
          select: { id: true },
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "ATTACHMENT_DELETED",
            entityType: "Attachment",
            entityId: id,
            metadata: { reportId, cleanupTaskId: cleanupTask.id },
          },
        });
        return { status: "DELETED", cleanupTaskId: cleanupTask.id } as const;
      }),
  };
}
