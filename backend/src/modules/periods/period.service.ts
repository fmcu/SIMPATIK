import type { PeriodStatus, ReportingPeriod } from "@prisma/client";
import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { PeriodRepository } from "./period.repository.js";

const transitions: Record<PeriodStatus, readonly PeriodStatus[]> = {
  DRAFT: ["DRAFT", "ACTIVE"],
  ACTIVE: ["ACTIVE", "CLOSED"],
  CLOSED: ["CLOSED"],
};

function validateDates(startDate: Date | undefined, dueDate: Date | undefined): void {
  if (startDate && dueDate && startDate > dueDate)
    throw new AppError(400, "VALIDATION_ERROR", "Tanggal periode tidak valid.", [
      { field: "dueDate", message: "dueDate harus setelah atau sama dengan startDate." },
    ]);
}

export class PeriodService {
  constructor(
    private readonly repository: PeriodRepository,
    private readonly audit: AuditRepository,
  ) {}

  list(input: {
    page: number;
    pageSize: number;
    status?: PeriodStatus | undefined;
    search?: string | undefined;
  }) {
    return this.repository.list({
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      status: input.status,
      search: input.search,
    });
  }

  detail(id: string) {
    return this.repository.findById(id).then((period) => {
      if (!period) throw new AppError(404, "NOT_FOUND", "Periode tidak ditemukan.");
      return period;
    });
  }

  async assertAcceptsReports(id: string): Promise<void> {
    const period = await this.detail(id);
    if (period.status !== "ACTIVE")
      throw new AppError(
        409,
        "PERIOD_INVALID_STATUS",
        "Laporan hanya dapat dibuat pada periode ACTIVE.",
      );
  }

  async create(
    data: { name: string; startDate: Date; dueDate: Date; status: PeriodStatus },
    actorId: string,
  ): Promise<ReportingPeriod> {
    if (data.status === "CLOSED")
      throw new AppError(400, "PERIOD_INVALID_STATUS", "Periode baru tidak dapat langsung CLOSED.");
    validateDates(data.startDate, data.dueDate);
    if (data.status === "ACTIVE" && (await this.repository.countActive()) > 0)
      throw new AppError(
        409,
        "PERIOD_ALREADY_ACTIVE",
        "Hanya satu periode ACTIVE yang diperbolehkan.",
      );
    const period = await this.repository.create(data);
    await this.audit.write({
      actorId,
      action: "PERIOD_CREATED",
      entityType: "ReportingPeriod",
      entityId: period.id,
      metadata: { status: period.status },
    });
    return period;
  }

  async update(
    id: string,
    data: { name?: string; startDate?: Date; dueDate?: Date; status?: PeriodStatus },
    actorId: string,
  ): Promise<ReportingPeriod> {
    const existing = await this.detail(id);
    validateDates(data.startDate ?? existing.startDate, data.dueDate ?? existing.dueDate);
    if (data.status && !transitions[existing.status].includes(data.status))
      throw new AppError(409, "PERIOD_INVALID_STATUS", "Transisi status periode tidak diizinkan.");
    if (data.status === "ACTIVE" && (await this.repository.countActive(id)) > 0)
      throw new AppError(
        409,
        "PERIOD_ALREADY_ACTIVE",
        "Hanya satu periode ACTIVE yang diperbolehkan.",
      );
    const period = await this.repository.update(id, data);
    await this.audit.write({
      actorId,
      action: "PERIOD_UPDATED",
      entityType: "ReportingPeriod",
      entityId: id,
      metadata: { fromStatus: existing.status, toStatus: period.status },
    });
    return period;
  }
}
