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
const defaultFilters = { periodId: "", uptId: "" };

export default function ReportApprovalPage() {
  const auth = useRequireSession();
  const canApprove = auth.session?.user.role === "PRODUCT_OWNER";
  const [rows, setRows] = useState<Report[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [upts, setUpts] = useState<UPT[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [periodId, setPeriodId] = useState(defaultFilters.periodId);
  const [uptId, setUptId] = useState(defaultFilters.uptId);
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
        apiClient.reports.list({ page, pageSize: 10, status: "REVIEWED", ...filters }),
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
    if (!canApprove) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canApprove, load]);

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
      id: "reviewed",
      header: "Selesai direviu",
      cell: (report) => (report.reviewedAt ? dateLabel(report.reviewedAt) : "—"),
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
          Periksa dan setujui
        </Link>
      ),
    },
  ];

  return (
    <AppShell>
      {!canApprove ? (
        <section className="rounded-xl border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hanya Product Owner yang dapat memberikan persetujuan akhir.
          </p>
        </section>
      ) : denied ? (
        <section
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <h1 className="text-xl font-bold text-destructive">Akses ditolak</h1>
          <p className="mt-2 text-sm text-destructive">
            Anda tidak memiliki izin melihat antrean persetujuan.
          </p>
        </section>
      ) : (
        <div className="space-y-8">
          <PageHeader
            eyebrow="Persetujuan Product Owner"
            title="Antrean persetujuan laporan"
            description="Periksa indikator, dokumen, catatan reviu, dan histori sebelum memberikan persetujuan akhir."
          />
          <FilterBar
            loading={loading}
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setFilters({ periodId, uptId });
            }}
            onReset={() => {
              setPeriodId(defaultFilters.periodId);
              setUptId(defaultFilters.uptId);
              setPage(1);
              setFilters(defaultFilters);
            }}
          >
            <FormField id="approval-period" label="Periode">
              <Select
                id="approval-period"
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
            <FormField id="approval-upt" label="UPT">
              <Select
                id="approval-upt"
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
          </FilterBar>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(report) => report.id}
            caption="Antrean persetujuan laporan Product Owner"
            loading={loading}
            loadingLabel="Memuat antrean persetujuan..."
            error={error ?? undefined}
            onRetry={() => void load()}
            pagination={pagination}
            onPageChange={setPage}
            emptyTitle="Tidak ada laporan menunggu persetujuan"
            emptyDescription="Laporan berstatus REVIEWED akan tampil di sini setelah reviu Kanwil selesai."
          />
        </div>
      )}
    </AppShell>
  );
}
