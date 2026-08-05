import type { ReportStatus } from "@prisma/client";

import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { DashboardFilters, DashboardRepository } from "./dashboard.repository.js";

const statuses: readonly ReportStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "REVISION_REQUIRED",
  "REVIEWED",
  "APPROVED",
];

export type DashboardScope = DashboardFilters & { uptScopeId?: string };

function scopedFilters(input: DashboardScope): DashboardFilters {
  return {
    ...(input.periodId === undefined ? {} : { periodId: input.periodId }),
    ...(input.uptScopeId ? { uptId: input.uptScopeId } : input.uptId ? { uptId: input.uptId } : {}),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.reportType === undefined ? {} : { reportType: input.reportType }),
  };
}

function reportState(
  reports: Array<{ status: ReportStatus; submittedAt: Date | null }>,
  dueDate: Date,
  now: Date,
) {
  const report = reports[0];
  if (!report) return { state: "NOT_SENT" as const, late: now > dueDate };
  return {
    state: report.status,
    late: now > dueDate && (report.submittedAt === null || report.submittedAt > dueDate),
  };
}

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly audit: AuditRepository,
  ) {}

  async summary(input: DashboardScope) {
    const filters = scopedFilters(input);
    const period = await this.repository.findPeriod(filters.periodId);
    if (!period) throw new AppError(404, "NOT_FOUND", "Periode tidak ditemukan.");
    const counts = await this.repository.summarize({ ...filters, periodId: period.id });
    return {
      period: {
        id: period.id,
        name: period.name,
        startDate: period.startDate,
        dueDate: period.dueDate,
      },
      filters: {
        periodId: period.id,
        ...(filters.uptId === undefined ? {} : { uptId: filters.uptId }),
        ...(filters.status === undefined ? {} : { status: filters.status }),
        ...(filters.reportType === undefined ? {} : { reportType: filters.reportType }),
      },
      counts: statuses.map((status) => ({ status, count: counts[status] })),
      approvedCount: counts.APPROVED,
      totalReports: statuses.reduce((total, status) => total + counts[status], 0),
    };
  }

  async byUpt(input: DashboardScope) {
    const filters = scopedFilters(input);
    const period = await this.repository.findPeriod(filters.periodId);
    if (!period) throw new AppError(404, "NOT_FOUND", "Periode tidak ditemukan.");
    const rows = await this.repository.listByUpt({ ...filters, periodId: period.id });
    const now = new Date();
    const status = rows.map((row) => {
      const state = reportState(row.reports, period.dueDate, now);
      const report = row.reports[0];
      return {
        upt: { id: row.id, code: row.code, name: row.name },
        status: state.state,
        reportId: report?.id ?? null,
        reportType: report?.reportType ?? null,
        updatedAt: report?.updatedAt ?? null,
        submittedAt: report?.submittedAt ?? null,
        late: state.late,
      };
    });
    return {
      period: {
        id: period.id,
        name: period.name,
        startDate: period.startDate,
        dueDate: period.dueDate,
      },
      status,
      notSent: status
        .filter((item) => item.status === "NOT_SENT" || item.status === "DRAFT")
        .map((item) => item.upt),
      late: status.filter((item) => item.late).map((item) => item.upt),
    };
  }

  async exportReports(input: DashboardScope & { actorId: string }) {
    const filters = scopedFilters(input);
    const period = await this.repository.findPeriod(filters.periodId);
    if (!period) throw new AppError(404, "NOT_FOUND", "Periode tidak ditemukan.");
    const reports = await this.repository.listReports({ ...filters, periodId: period.id });
    await this.audit.write({
      actorId: input.actorId,
      action: "REPORTS_EXPORTED",
      entityType: "ReportExport",
      metadata: {
        periodId: period.id,
        uptId: filters.uptId,
        status: filters.status,
        reportType: filters.reportType,
        reportCount: reports.length,
      },
    });
    return { period, filters, reports };
  }
}
