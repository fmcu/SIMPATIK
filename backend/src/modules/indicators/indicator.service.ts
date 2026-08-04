import type { ApprovalStatus, Indicator } from "@prisma/client";
import type { IndicatorCreate } from "@simpatik/contracts";
import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { IndicatorRepository } from "./indicator.repository.js";

export class IndicatorService {
  constructor(
    private readonly repository: IndicatorRepository,
    private readonly audit: AuditRepository,
  ) {}

  list(periodId: string) {
    return this.repository.list(periodId);
  }

  async detail(id: string): Promise<Indicator> {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError(404, "NOT_FOUND", "Indikator tidak ditemukan.");
    return item;
  }

  async create(periodId: string, data: IndicatorCreate, actorId: string): Promise<Indicator> {
    const period = await this.repository.period(periodId);
    if (!period) throw new AppError(404, "NOT_FOUND", "Periode tidak ditemukan.");
    if (period.status !== "DRAFT")
      throw new AppError(
        409,
        "CONFIGURATION_LOCKED",
        "Konfigurasi hanya dapat diubah pada periode DRAFT.",
      );
    const item = await this.repository.create({ periodId, ...data });
    await this.audit.write({
      actorId,
      action: "INDICATOR_CREATED",
      entityType: "Indicator",
      entityId: item.id,
      metadata: { periodId },
    });
    return item;
  }

  async update(id: string, data: Partial<IndicatorCreate>, actorId: string): Promise<Indicator> {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError(404, "NOT_FOUND", "Indikator tidak ditemukan.");
    if (item.approvalStatus === "APPROVED" || item.period.status !== "DRAFT")
      throw new AppError(
        409,
        "CONFIGURATION_LOCKED",
        "Indikator telah disahkan atau periodenya tidak dapat diubah.",
      );
    const updated = await this.repository.update(id, data);
    await this.audit.write({
      actorId,
      action: "INDICATOR_UPDATED",
      entityType: "Indicator",
      entityId: id,
    });
    return updated;
  }

  async approve(
    id: string,
    status: ApprovalStatus,
    actorId: string,
    reason?: string,
  ): Promise<Indicator> {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError(404, "NOT_FOUND", "Indikator tidak ditemukan.");
    if (item.approvalStatus === "APPROVED")
      throw new AppError(
        409,
        "CONFIGURATION_LOCKED",
        "Indikator yang telah disahkan tidak dapat diubah.",
      );
    if (item.period.status !== "DRAFT")
      throw new AppError(
        409,
        "CONFIGURATION_LOCKED",
        "Indikator pada periode berjalan tidak dapat diubah.",
      );
    const result = await this.repository.approve(id, status, actorId, reason);
    await this.audit.write({
      actorId,
      action: status === "APPROVED" ? "INDICATOR_APPROVED" : "INDICATOR_REJECTED",
      entityType: "Indicator",
      entityId: id,
      metadata: { reason },
    });
    return result;
  }
}
