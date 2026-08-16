"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select } from "@/components/ui/select";
import { ApiClientError, apiClient, type Period, type Report, type UPT } from "@/lib/api-client";
import { dateLabel, errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

const emptyPagination = { page: 1, pageSize: 10, total: 0, totalPages: 0 };
const defaultFilters = { periodId: "", uptId: "", status: "SUBMITTED" };

export default function ReportReviewPage() {
  const auth = useRequireSession();
  const canReview = auth.session?.user.role === "PETUGAS_KANWIL";
  const [rows, setRows] = useState<Report[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [upts, setUpts] = useState<UPT[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [periodId, setPeriodId] = useState(defaultFilters.periodId);
  const [uptId, setUptId] = useState(defaultFilters.uptId);
  const [status, setStatus] = useState(defaultFilters.status);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const [reports, periodList, uptList] = await Promise.all([
        apiClient.reports.list({ page, pageSize: 10, ...filters }),
        apiClient.periods.list({ page: 1, pageSize: 100 }),
        apiClient.upts.list({ page: 1, pageSize: 100 }),
      ]);
      setRows(reports.data);
      setPagination(reports.pagination);
      setPeriods(periodList.data);
      setUpts(uptList.data);
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.isForbidden) setDenied(true);
      else setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (!canReview) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canReview, load]);

  const columns: DataTableColumn<Report>[] = [
    {
      id: "report",
      header: "Laporan",
      cell: (report) => (
        <div>
          <p className="font-semibold">{report.reportType}</p>
          <p className="text-xs text-muted-foreground">{report.period.name}</p>
        </div>
      ),
    },
    {
      id: "upt",
      header: "UPT",
      cell: (report) => (
        <div>
          <p className="font-medium">{report.upt.code}</p>
          <p className="text-xs text-muted-foreground">{report.upt.name}</p>
        </div>
      ),
    },
    { id: "status", header: "Status", cell: (report) => <StatusBadge status={report.status} /> },
    {
      id: "submitted",
      header: "Diajukan",
      cell: (report) => (report.submittedAt ? dateLabel(report.submittedAt) : "—"),
    },
    {
      id: "actions",
      header: "Aksi",
      className: "text-right",
      cell: (report) => (
        <Link
          href={`/reports/${report.id}`}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Eye />
          Reviu
        </Link>
      ),
    },
  ];

  return (
    <AppShell>
      {!canReview ? (
        <section className="rounded-xl border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hanya Petugas Kanwil yang dapat mereviu laporan.
          </p>
        </section>
      ) : denied ? (
        <section
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <h1 className="text-xl font-bold text-destructive">Akses ditolak</h1>
          <p className="mt-2 text-sm text-destructive">
            Anda tidak memiliki izin melihat antrean reviu.
          </p>
        </section>
      ) : (
        <div className="space-y-8">
          <PageHeader
            eyebrow="Pelaporan"
            title="Antrean reviu Kanwil"
            description="Reviu laporan yang telah diajukan UPT sebelum diteruskan ke proses berikutnya."
          />
          <FilterBar
            loading={loading}
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setFilters({ periodId, uptId, status });
            }}
            onReset={() => {
              setPeriodId(defaultFilters.periodId);
              setUptId(defaultFilters.uptId);
              setStatus(defaultFilters.status);
              setPage(1);
              setFilters(defaultFilters);
            }}
          >
            <FormField id="review-period" label="Periode">
              <Select
                id="review-period"
                value={periodId}
                onChange={(event) => setPeriodId(event.target.value)}
                disabled={loading}
              >
                <option value="">Semua periode</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="review-upt" label="UPT">
              <Select
                id="review-upt"
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
            <FormField id="review-status" label="Status">
              <Select
                id="review-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={loading}
              >
                <option value="SUBMITTED">Diajukan</option>
                <option value="REVISION_REQUIRED">Perlu revisi</option>
                <option value="REVIEWED">Selesai direviu</option>
                <option value="APPROVED">Disetujui</option>
              </Select>
            </FormField>
          </FilterBar>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(report) => report.id}
            caption="Antrean reviu laporan Kanwil"
            loading={loading}
            loadingLabel="Memuat antrean reviu..."
            error={error ?? undefined}
            onRetry={() => void load()}
            pagination={pagination}
            onPageChange={setPage}
            emptyTitle="Tidak ada laporan untuk direviu"
            emptyDescription="Laporan yang sesuai dengan filter akan tampil di sini."
          />
        </div>
      )}
    </AppShell>
  );
}
