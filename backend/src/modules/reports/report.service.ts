import { AppError } from "../../middleware/error.js";
import { ReportCompletenessService } from "./report-completeness.service.js";
import type { ReportRepository, ReportDetail } from "./report.repository.js";
import type { ReportCreateInput, ReportListInput, ReportUpdateInput } from "./report.types.js";

const editableStatuses = new Set(["DRAFT", "REVISION_REQUIRED"]);

type ReportCompletenessValidator = Pick<ReportCompletenessService, "validate">;

export class ReportService {
  constructor(
    private readonly repository: ReportRepository,
    private readonly completeness?: ReportCompletenessValidator,
  ) {}

  list(input: ReportListInput) {
    return this.repository.list({
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      periodId: input.periodId,
      uptId: input.uptId,
      status: input.status,
      uptScopeId: input.uptScopeId,
    });
  }

  async detail(id: string, uptScopeId?: string): Promise<ReportDetail> {
    const report = await this.repository.findById(id, uptScopeId);
    if (!report) throw new AppError(404, "NOT_FOUND", "Laporan tidak ditemukan.");
    return report;
  }

  async create(input: ReportCreateInput): Promise<ReportDetail> {
    const context = await this.repository.findCreationContext(input.periodId, input.uptId);
    if (!context.period) throw new AppError(404, "NOT_FOUND", "Periode tidak ditemukan.");
    if (context.period.status !== "ACTIVE") {
      throw new AppError(
        409,
        "PERIOD_INVALID_STATUS",
        "Laporan hanya dapat dibuat pada periode ACTIVE.",
      );
    }
    if (!context.upt) {
      throw new AppError(403, "UPT_SCOPE_FORBIDDEN", "UPT akun tidak aktif atau tidak ditemukan.");
    }
    if (await this.repository.exists(input.uptId, input.periodId, input.reportType)) {
      throw new AppError(
        409,
        "CONFLICT",
        "Laporan untuk UPT, periode, dan tipe ini sudah tersedia.",
      );
    }
    return this.repository.createDraft({
      ...input,
      indicatorIds: context.period.indicators.map((indicator) => indicator.id),
    });
  }

  async validateCompleteness(id: string, uptScopeId?: string): Promise<{ valid: true }> {
    if (!this.completeness) {
      throw new AppError(500, "INTERNAL_ERROR", "Layanan validasi laporan belum tersedia.");
    }
    const report = await this.detail(id, uptScopeId);
    const fields = await this.completeness.validate(report);
    if (fields.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Laporan belum lengkap.", fields);
    }
    return { valid: true };
  }

  async submit(id: string, uptScopeId: string, actorId: string): Promise<ReportDetail> {
    if (!this.completeness) {
      throw new AppError(500, "INTERNAL_ERROR", "Layanan validasi laporan belum tersedia.");
    }
    const submitted = await this.repository.submit({
      id,
      uptScopeId,
      actorId,
      validate: async (report) => {
        const fields = await this.completeness!.validate(report);
        if (fields.length) {
          throw new AppError(400, "VALIDATION_ERROR", "Laporan belum lengkap.", fields);
        }
      },
    });
    if (submitted === "NOT_FOUND") throw new AppError(404, "NOT_FOUND", "Laporan tidak ditemukan.");
    if (submitted === "INVALID_STATUS") {
      throw new AppError(
        409,
        "REPORT_INVALID_STATUS",
        "Laporan hanya dapat diajukan dari status DRAFT atau REVISION_REQUIRED.",
      );
    }
    return submitted;
  }

  async update(id: string, input: ReportUpdateInput): Promise<ReportDetail> {
    const report = await this.detail(id, input.uptScopeId);
    if (!editableStatuses.has(report.status)) {
      throw new AppError(
        409,
        "REPORT_LOCKED",
        "Laporan hanya dapat diubah saat berstatus DRAFT atau REVISION_REQUIRED.",
      );
    }
    if (report.version !== input.version) {
      throw new AppError(
        409,
        "REPORT_VERSION_CONFLICT",
        "Laporan telah berubah. Muat ulang data sebelum menyimpan lagi.",
      );
    }

    const reportIndicatorIds = new Set(report.items.map((item) => item.indicatorId));
    const fields = input.items.flatMap((item, index) =>
      reportIndicatorIds.has(item.indicatorId)
        ? []
        : [
            {
              field: `items.${index}.indicatorId`,
              message: "Indikator tidak termasuk dalam periode laporan.",
            },
          ],
    );
    if (fields.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Data item laporan tidak valid.", fields);
    }

    const updated = await this.repository.updateDraft({
      id,
      uptScopeId: input.uptScopeId,
      version: input.version,
      items: input.items,
      actorId: input.actorId,
    });
    if (!updated) {
      throw new AppError(
        409,
        "REPORT_VERSION_CONFLICT",
        "Laporan telah berubah. Muat ulang data sebelum menyimpan lagi.",
      );
    }
    return updated;
  }
}
