import assert from "node:assert/strict";
import test from "node:test";
import type { ReportStatus } from "@prisma/client";

import { renderReportsCsv } from "../exports/report-csv.service.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type {
  DashboardPeriod,
  DashboardReport,
  DashboardRepository,
} from "./dashboard.repository.js";
import { DashboardService } from "./dashboard.service.js";

const period: DashboardPeriod = {
  id: "period-1",
  name: "Semester I 2026",
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  dueDate: new Date("2026-06-30T00:00:00.000Z"),
};

const sourceReports = [
  {
    id: "approved-report",
    uptId: "upt-01",
    periodId: period.id,
    reportType: "KEPATUHAN",
    status: "APPROVED" as const,
    updatedAt: new Date("2026-06-20T00:00:00.000Z"),
    submittedAt: new Date("2026-06-10T00:00:00.000Z"),
    upt: { id: "upt-01", code: "UPT-01", name: "UPT Satu" },
    period,
    items: [{ value: "100", narrative: "Lengkap" }],
  },
  {
    id: "submitted-report",
    uptId: "upt-02",
    periodId: period.id,
    reportType: "KEPATUHAN",
    status: "SUBMITTED" as const,
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    submittedAt: new Date("2026-06-25T00:00:00.000Z"),
    upt: { id: "upt-02", code: "UPT-02", name: "UPT Dua" },
    period,
    items: [{ value: "50", narrative: null }],
  },
] satisfies DashboardReport[];

type DashboardUptRow = Awaited<ReturnType<DashboardRepository["listByUpt"]>>["items"][number];
const upts: DashboardUptRow[] = [
  { id: "upt-01", code: "UPT-01", name: "UPT Satu", reports: [sourceReports[0]!] },
  { id: "upt-02", code: "UPT-02", name: "UPT Dua", reports: [sourceReports[1]!] },
  { id: "upt-03", code: "UPT-03", name: "UPT Tiga", reports: [] },
];

function createSourceRepository(): DashboardRepository {
  return {
    async findPeriod() {
      return period;
    },
    async summarize(filters) {
      const counts: Record<ReportStatus, number> = {
        DRAFT: 0,
        SUBMITTED: 0,
        REVISION_REQUIRED: 0,
        REVIEWED: 0,
        APPROVED: 0,
      };
      sourceReports
        .filter((report) => !filters.status || report.status === filters.status)
        .forEach((report) => {
          counts[report.status] += 1;
        });
      return counts;
    },
    async listByUpt() {
      return { items: upts, total: upts.length };
    },
    async listReports(filters) {
      return sourceReports.filter((report) => !filters.status || report.status === filters.status);
    },
  };
}

const audit: AuditRepository = { write: async () => undefined };

test("dashboard and CSV reconcile with APPROVED report source data", async () => {
  const service = new DashboardService(createSourceRepository(), audit);
  const summary = await service.summary({ periodId: period.id });
  const exported = await service.exportReports({ periodId: period.id, actorId: "leader-1" });
  const csv = renderReportsCsv({
    periodId: exported.period.id,
    periodName: exported.period.name,
    filters: exported.filters,
    exportedAt: new Date("2026-06-26T00:00:00.000Z"),
    actorName: "Pimpinan",
    reports: exported.reports,
  });

  assert.equal(summary.totalReports, sourceReports.length);
  assert.equal(
    summary.approvedCount,
    sourceReports.filter((report) => report.status === "APPROVED").length,
  );
  assert.equal(exported.reports.length, sourceReports.length);
  assert.equal(csv.split("\r\n").filter((line) => line.includes("approved-report")).length, 1);
  assert.match(csv, /UPT-01/);
  assert.match(csv, /APPROVED/);
});

test("CSV prefixes formula-like values to prevent spreadsheet execution", () => {
  const report = sourceReports[0]!;
  const csv = renderReportsCsv({
    periodId: period.id,
    periodName: period.name,
    filters: {},
    exportedAt: new Date("2026-06-26T00:00:00.000Z"),
    actorName: "Pimpinan",
    reports: [{ ...report, upt: { ...report.upt, name: '=HYPERLINK("https://example.invalid")' } }],
  });
  assert.match(csv, /'=HYPERLINK/);
});
