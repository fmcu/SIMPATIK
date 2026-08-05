import type { ReportStatus } from "@prisma/client";

import type { DashboardReport } from "../dashboard/dashboard.repository.js";

const jakartaFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jakarta",
  dateStyle: "short",
  timeStyle: "medium",
});

function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function summary(report: DashboardReport): string {
  const filledItems = report.items.filter(
    (item) => item.value?.trim() || item.narrative?.trim(),
  ).length;
  return `${filledItems} item terisi`;
}

export type CsvExportInput = {
  periodId: string;
  periodName: string;
  filters: {
    uptId?: string;
    status?: ReportStatus;
    reportType?: string;
  };
  exportedAt: Date;
  actorName: string;
  reports: DashboardReport[];
};

export function renderReportsCsv(input: CsvExportInput): string {
  const filterText = [
    `periode=${input.periodName}`,
    input.filters.uptId ? `uptId=${input.filters.uptId}` : undefined,
    input.filters.status ? `status=${input.filters.status}` : undefined,
    input.filters.reportType ? `reportType=${input.filters.reportType}` : undefined,
  ]
    .filter(Boolean)
    .join(";");
  const metadata = [
    ["Periode", input.periodName],
    ["Filter", filterText],
    ["Waktu ekspor", jakartaFormatter.format(input.exportedAt)],
    ["Pembuat ekspor", input.actorName],
  ];
  const rows = input.reports.map((report) => [
    input.periodName,
    filterText,
    jakartaFormatter.format(input.exportedAt),
    input.actorName,
    report.upt.code,
    report.upt.name,
    report.reportType,
    report.status,
    report.id,
    summary(report),
    jakartaFormatter.format(report.updatedAt),
  ]);
  return [
    ...metadata.map((row) => row.map(csvCell).join(",")),
    "",
    [
      "Periode",
      "Filter",
      "Waktu ekspor",
      "Pembuat ekspor",
      "Kode UPT",
      "Nama UPT",
      "Tipe laporan",
      "Status",
      "ID laporan",
      "Data ringkas",
      "Diperbarui",
    ]
      .map(csvCell)
      .join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}
