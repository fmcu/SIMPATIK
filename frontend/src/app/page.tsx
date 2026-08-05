"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, CheckCircle2, Clock3, FileCheck2, FileText, Plus } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormField } from "@/components/shared/form-field";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  ApiClientError,
  apiClient,
  type DashboardByUpt,
  type DashboardQuery,
  type DashboardSummary,
  type Period,
  type Report,
  type ReportStatus,
  type UPT,
} from "@/lib/api-client";
import { dateLabel, errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

const statuses: ReportStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "REVISION_REQUIRED",
  "REVIEWED",
  "APPROVED",
];
const statusTitles: Record<ReportStatus, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Diajukan",
  REVISION_REQUIRED: "Perlu revisi",
  REVIEWED: "Selesai direviu",
  APPROVED: "Disetujui",
};

function queryWithoutEmpty(query: {
  periodId: string;
  uptId: string;
  status: string;
}): DashboardQuery {
  return {
    ...(query.periodId ? { periodId: query.periodId } : {}),
    ...(query.uptId ? { uptId: query.uptId } : {}),
    ...(query.status ? { status: query.status as ReportStatus } : {}),
  };
}

function reportStatusCount(summary: DashboardSummary | null, status: ReportStatus): number {
  return summary?.counts.find((item) => item.status === status)?.count ?? 0;
}

export default function HomePage() {
  const auth = useRequireSession();
  const role = auth.session?.user.role;
  const canCreate = role === "PETUGAS_UPT";
  const canFilterUpt = role === "PIMPINAN" || role === "PRODUCT_OWNER" || role === "PETUGAS_KANWIL" || role === "ADMIN_SIMPATIK";
  const [periods, setPeriods] = useState<Period[]>([]);
  const [upts, setUpts] = useState<UPT[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [uptId, setUptId] = useState("");
  const [status, setStatus] = useState("");
  const [filters, setFilters] = useState({ periodId: "", uptId: "", status: "" });
  const [uptPage, setUptPage] = useState(1);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [byUpt, setByUpt] = useState<DashboardByUpt | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const [periodList, uptList] = await Promise.all([
        apiClient.periods.list({ page: 1, pageSize: 100 }),
        canFilterUpt ? apiClient.upts.list({ page: 1, pageSize: 100 }) : Promise.resolve(null),
      ]);
      const effectivePeriodId =
        filters.periodId ||
        periodList.data.find((period) => period.status === "ACTIVE")?.id ||
        periodList.data[0]?.id;
      if (!effectivePeriodId) {
        setPeriods(periodList.data);
        setUpts(uptList?.data ?? []);
        setSummary(null);
        setByUpt(null);
        setReports([]);
        return;
      }
      const query = queryWithoutEmpty({ ...filters, periodId: effectivePeriodId });
      const [summaryResult, byUptResult, reportList] = await Promise.all([
        apiClient.dashboard.summary(query),
        apiClient.dashboard.byUpt({ ...query, page: uptPage, pageSize: 25 }),
        apiClient.reports.list({ page: 1, pageSize: 10, ...query }),
      ]);
      setPeriods(periodList.data);
       setUpts(uptList?.data ?? []);
      setPeriodId(effectivePeriodId);
      setSummary(summaryResult);
      setByUpt(byUptResult);
      setReports(reportList.data);
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.isForbidden) setDenied(true);
      else setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [canFilterUpt, filters, uptPage]);

  useEffect(() => {
    if (!auth.session) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [auth.session, load]);

  const reportColumns = useMemo<DataTableColumn<Report>[]>(
    () => [
      {
        id: "report",
        header: "Laporan",
        cell: (row) => (
          <div>
            <Link
              className="font-semibold text-primary hover:underline"
              href={`/reports/${row.id}`}
            >
              {row.reportType}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">{row.period.name}</p>
          </div>
        ),
      },
      {
        id: "upt",
        header: "UPT",
        cell: (row) => (
          <div>
            <p className="font-medium">{row.upt.code}</p>
            <p className="text-xs text-muted-foreground">{row.upt.name}</p>
          </div>
        ),
      },
      { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      { id: "updated", header: "Diperbarui", cell: (row) => dateLabel(row.updatedAt) },
    ],
    [],
  );

  const periodName = summary?.period.name ?? "Belum ada periode";
  const notSentText = byUpt ? `${byUpt.notSent.length} UPT` : "—";
  const lateText = byUpt ? `${byUpt.late.length} UPT` : "—";
  const latestStatus = byUpt?.status ?? [];
  const uptColumns: DataTableColumn<DashboardByUpt["status"][number]>[] = [
    {
      id: "upt",
      header: "UPT",
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.upt.code}</p>
          <p className="text-xs text-muted-foreground">{row.upt.name}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) =>
        row.status === "NOT_SENT" ? (
          <span className="text-sm text-muted-foreground">Belum mengirim</span>
        ) : (
          <StatusBadge status={row.status} />
        ),
    },
    {
      id: "late",
      header: "Tenggat",
      cell: (row) =>
        row.late ? (
          <span className="font-medium text-destructive">Terlambat</span>
        ) : (
          <span className="text-muted-foreground">Sesuai</span>
        ),
    },
    {
      id: "detail",
      header: "Drill-down",
      className: "text-right",
      cell: (row) =>
        row.reportId ? (
          <Link
            className="text-sm font-semibold text-primary hover:underline"
            href={`/reports/${row.reportId}`}
          >
            Lihat laporan
          </Link>
        ) : (
          <Link
            className="text-sm font-semibold text-primary hover:underline"
            href={`/reports?periodId=${summary?.period.id ?? ""}&uptId=${row.upt.id}`}
          >
            Daftar
          </Link>
        ),
    },
  ];

  async function exportCsv() {
    setExporting(true);
    try {
      await apiClient.exports.reportsCsv(queryWithoutEmpty(filters));
    } catch (exportError) {
      setError(errorMessage(exportError));
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      {denied ? (
        <EmptyState
          title="Akses ditolak"
          description="Anda tidak memiliki izin melihat dashboard."
        />
      ) : error ? (
        <LoadingState label={error} error onRetry={() => void load()} />
      ) : (
        <div className="space-y-8">
          <PageHeader
            eyebrow="Ringkasan pelaporan"
            title={role === "PIMPINAN" ? "Dasbor pimpinan" : "Dasbor kepatuhan"}
            description={`Pantau status pelaporan 12 UPT pada ${periodName}.`}
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void exportCsv()}
                  disabled={loading || exporting || !summary}
                >
                  <ArrowDownToLine />
                  {exporting ? "Menyiapkan..." : "Unduh rekap"}
                </Button>
                {canCreate ? (
                  <Link
                    href="/reports/new"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    <Plus />
                    Buat laporan
                  </Link>
                ) : null}
              </>
            }
          />

          <FilterBar
            loading={loading}
            onSubmit={(event) => {
              event.preventDefault();
              setUptPage(1);
              setFilters({ periodId, uptId, status });
            }}
            onReset={() => {
              setPeriodId("");
              setUptId("");
              setStatus("");
              setUptPage(1);
              setFilters({ periodId: "", uptId: "", status: "" });
            }}
          >
            <FormField id="dashboard-period" label="Periode">
              <Select
                id="dashboard-period"
                value={periodId}
                onChange={(event) => setPeriodId(event.target.value)}
                disabled={loading}
              >
                <option value="">Periode aktif</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="dashboard-status" label="Status">
              <Select
                id="dashboard-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={loading}
              >
                <option value="">Semua status</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {statusTitles[item]}
                  </option>
                ))}
              </Select>
            </FormField>
            {canFilterUpt ? (
              <FormField id="dashboard-upt" label="UPT">
                <Select
                  id="dashboard-upt"
                  value={uptId}
                  onChange={(event) => setUptId(event.target.value)}
                  disabled={loading}
                >
                  <option value="">Semua UPT</option>
                  {upts.map((upt) => (
                    <option key={upt.id} value={upt.id}>
                      {upt.code} — {upt.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : null}
          </FilterBar>

          {loading && !summary ? (
            <LoadingState label="Memuat ringkasan dashboard..." />
          ) : !summary || !byUpt ? (
            <EmptyState
              title="Belum ada periode"
              description="Buat atau aktifkan periode pelaporan untuk menampilkan dashboard."
            />
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Link href={`/reports?periodId=${summary.period.id}`}>
                  <DashboardCard
                    title="Total laporan"
                    value={summary.totalReports}
                    description="drill-down daftar laporan"
                    icon={<FileText className="size-5" />}
                  />
                </Link>
                <Link href={`/reports?periodId=${summary.period.id}&status=APPROVED`}>
                  <DashboardCard
                    title="Disetujui"
                    value={summary.approvedCount}
                    description="data rekap resmi"
                    icon={<CheckCircle2 className="size-5" />}
                  />
                </Link>
                <Link href={`/reports?periodId=${summary.period.id}&status=SUBMITTED`}>
                  <DashboardCard
                    title="Menunggu reviu"
                    value={reportStatusCount(summary, "SUBMITTED")}
                    description="perlu ditindaklanjuti"
                    icon={<Clock3 className="size-5" />}
                  />
                </Link>
                <Link href={`/reports?periodId=${summary.period.id}&status=REVISION_REQUIRED`}>
                  <DashboardCard
                    title="Perlu revisi"
                    value={reportStatusCount(summary, "REVISION_REQUIRED")}
                    description="menunggu perbaikan"
                    icon={<FileCheck2 className="size-5" />}
                  />
                </Link>
                <DashboardCard
                  title="Belum mengirim"
                  value={notSentText}
                  description="UPT tanpa pengajuan"
                  icon={<FileText className="size-5" />}
                />
              </section>

              <section className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                <div className="min-w-0 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Status setiap UPT</h2>
                    <p className="text-sm text-muted-foreground">
                      Tenggat periode: {dateLabel(summary.period.dueDate)} · Terlambat: {lateText}
                    </p>
                  </div>
                  <DataTable
                    columns={uptColumns}
                    data={latestStatus}
                    getRowId={(row) => row.upt.id}
                    caption="Status pelaporan per UPT"
                     emptyTitle="Status UPT belum tersedia"
                     emptyDescription="Belum ada data UPT pada filter ini."
                     pagination={byUpt.pagination}
                     onPageChange={setUptPage}
                   />
                </div>
                <aside className="rounded-xl border bg-primary p-5 text-primary-foreground">
                  <p className="text-sm font-semibold">Ringkasan tenggat</p>
                  <p className="mt-4 text-3xl font-bold">{lateText}</p>
                  <p className="mt-1 text-sm text-primary-foreground/75">UPT terlambat mengirim</p>
                  <div className="mt-6 space-y-3 text-sm">
                    <p className="flex justify-between gap-4">
                      <span>Belum mengirim</span>
                      <strong>{notSentText}</strong>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span>Total UPT</span>
                      <strong>{byUpt.pagination?.total ?? latestStatus.length}</strong>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span>Tenggat</span>
                      <strong>{dateLabel(summary.period.dueDate)}</strong>
                    </p>
                  </div>
                </aside>
              </section>

              <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Laporan terbaru</h2>
                    <p className="text-sm text-muted-foreground">
                      Drill-down dari data laporan sumber.
                    </p>
                  </div>
                  <Link
                    className="text-sm font-semibold text-primary hover:underline"
                    href={`/reports?periodId=${summary.period.id}`}
                  >
                    Lihat semua
                  </Link>
                </div>
                <DataTable
                  columns={reportColumns}
                  data={reports}
                  getRowId={(row) => row.id}
                  caption="Laporan terbaru dashboard"
                  emptyTitle="Laporan belum tersedia"
                  emptyDescription="Belum ada laporan yang sesuai dengan filter saat ini."
                />
              </section>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
