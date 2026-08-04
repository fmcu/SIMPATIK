import type { ApprovalStatus, RequiredDocument } from "@prisma/client";
import type { RequiredDocumentCreate } from "@simpatik/contracts";
import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { DocumentRepository } from "./document.repository.js";
import { findMissingRequiredDocuments } from "./document.validation.js";

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly audit: AuditRepository,
  ) {}

  list(scope: { periodId?: string | undefined; indicatorId?: string | undefined }) {
    return this.repository.list(scope);
  }

  async missingForReport(periodId: string, reportId: string) {
    const [requirements, attachmentRequirementIds] = await Promise.all([
      this.repository.requiredForReport(periodId),
      this.repository.attachmentRequirementIds(reportId),
    ]);
    return findMissingRequiredDocuments(requirements, attachmentRequirementIds);
  }

  async detail(id: string): Promise<RequiredDocument> {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError(404, "NOT_FOUND", "Dokumen wajib tidak ditemukan.");
    return item;
  }

  async create(
    data: RequiredDocumentCreate,
    actorId: string,
    expectedPeriodId?: string | undefined,
  ): Promise<RequiredDocument> {
    const period = data.periodId ? await this.repository.period(data.periodId) : null;
    const indicator = data.indicatorId ? await this.repository.indicator(data.indicatorId) : null;
    if (data.periodId && !period) throw new AppError(404, "NOT_FOUND", "Periode tidak ditemukan.");
    if (data.indicatorId && !indicator)
      throw new AppError(404, "NOT_FOUND", "Indikator tidak ditemukan.");
    if (expectedPeriodId && indicator && indicator.period.id !== expectedPeriodId)
      throw new AppError(400, "VALIDATION_ERROR", "Indikator bukan bagian dari periode.", [
        { field: "indicatorId", message: "Indikator bukan bagian dari periode." },
      ]);
    if ((period?.status ?? indicator?.period.status) !== "DRAFT")
      throw new AppError(
        409,
        "CONFIGURATION_LOCKED",
        "Dokumen hanya dapat dikonfigurasi pada periode DRAFT.",
      );
    const item = await this.repository.create(data);
    await this.audit.write({
      actorId,
      action: "DOCUMENT_CREATED",
      entityType: "RequiredDocument",
      entityId: item.id,
    });
    return item;
  }

  async update(
    id: string,
    data: Partial<RequiredDocumentCreate>,
    actorId: string,
  ): Promise<RequiredDocument> {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError(404, "NOT_FOUND", "Dokumen wajib tidak ditemukan.");
    const status = item.period?.status ?? item.indicator?.period.status;
    if (item.approvalStatus === "APPROVED" || status !== "DRAFT")
      throw new AppError(
        409,
        "CONFIGURATION_LOCKED",
        "Dokumen telah disahkan atau periodenya tidak dapat diubah.",
      );
    const updated = await this.repository.update(id, data);
    await this.audit.write({
      actorId,
      action: "DOCUMENT_UPDATED",
      entityType: "RequiredDocument",
      entityId: id,
    });
    return updated;
  }

  async approve(
    id: string,
    status: ApprovalStatus,
    actorId: string,
    reason?: string,
  ): Promise<RequiredDocument> {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError(404, "NOT_FOUND", "Dokumen wajib tidak ditemukan.");
    const periodStatus = item.period?.status ?? item.indicator?.period.status;
    if (item.approvalStatus === "APPROVED")
      throw new AppError(
        409,
        "CONFIGURATION_LOCKED",
        "Dokumen yang telah disahkan tidak dapat diubah.",
      );
    if (periodStatus !== "DRAFT")
      throw new AppError(
        409,
        "CONFIGURATION_LOCKED",
        "Dokumen pada periode berjalan tidak dapat diubah.",
      );
    const result = await this.repository.approve(id, status, actorId, reason);
    await this.audit.write({
      actorId,
      action: status === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
      entityType: "RequiredDocument",
      entityId: id,
      metadata: { reason },
    });
    return result;
  }
}
