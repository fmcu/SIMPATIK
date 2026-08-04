"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, FilePlus2, Pencil } from "lucide-react";

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
const reportRoles = [
  "PIMPINAN",
  "PRODUCT_OWNER",
  "PETUGAS_KANWIL",
  "KOORDINATOR_UPT",
  "PETUGAS_UPT",
] as const;

export default function ReportsPage() {
  const auth = useRequireSession();
  const role = auth.session?.user.role;
  const canView = Boolean(role && reportRoles.includes(role as (typeof reportRoles)[number]));
  const canCreate = role === "PETUGAS_UPT";
  const canFilterUpt = role === "PIMPINAN" || role === "PRODUCT_OWNER" || role === "PETUGAS_KANWIL";
  const [rows, setRows] = useState<Report[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [upts, setUpts] = useState<UPT[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [periodId, setPeriodId] = useState("");
  const [status, setStatus] = useState("");
  const [uptId, setUptId] = useState("");
  const [filters, setFilters] = useState({ periodId: "", status: "", uptId: "" });
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
        canFilterUpt ? apiClient.upts.list({ page: 1, pageSize: 100 }) : Promise.resolve(null),
      ]);
      setRows(reports.data);
      setPagination(reports.pagination);
      setPeriods(periodList.data);
      setUpts(uptList?.data ?? []);
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.isForbidden) setDenied(true);
      else setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [canFilterUpt, filters, page]);

  useEffect(() => {
    if (!canView) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canView, load]);

  const columns: DataTableColumn<Report>[] = [
    {
      id: "period",
      header: "Periode",
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.period.name}</p>
          <p className="text-xs text-muted-foreground">{row.reportType}</p>
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
    {
      id: "actions",
      header: "Aksi",
      className: "text-right",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Link
            href={`/reports/${row.id}`}
            className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Eye />
            Detail
          </Link>
          {canCreate && (row.status === "DRAFT" || row.status === "REVISION_REQUIRED") ? (
            <Link
              href={`/reports/${row.id}/edit`}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Pencil />
              Ubah
            </Link>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      {!canView ? (
        <section className="rounded-xl border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Halaman laporan tidak tersedia untuk role ini.
          </p>
        </section>
      ) : denied ? (
        <section
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <h1 className="text-xl font-bold text-destructive">Akses ditolak</h1>
          <p className="mt-2 text-sm text-destructive">Anda tidak memiliki izin melihat laporan.</p>
        </section>
      ) : (
        <div className="space-y-8">
          <PageHeader
            eyebrow="Pelaporan"
            title="Daftar laporan"
            description="Pantau draf dan laporan per periode, UPT, serta status."
            actions={
              canCreate ? (
                <Link
                  href="/reports/new"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <FilePlus2 />
                  Buat draf
                </Link>
              ) : undefined
            }
          />
          <FilterBar
            loading={loading}
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setFilters({ periodId, status, uptId: canFilterUpt ? uptId : "" });
            }}
            onReset={() => {
              setPeriodId("");
              setStatus("");
              setUptId("");
              setPage(1);
              setFilters({ periodId: "", status: "", uptId: "" });
            }}
          >
            <FormField id="report-period" label="Periode">
              <Select
                id="report-period"
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
            <FormField id="report-status" label="Status">
              <Select
                id="report-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={loading}
              >
                <option value="">Semua status</option>
                <option value="DRAFT">Draf</option>
                <option value="SUBMITTED">Diajukan</option>
                <option value="REVISION_REQUIRED">Perlu revisi</option>
                <option value="REVIEWED">Selesai direviu</option>
                <option value="APPROVED">Disetujui</option>
              </Select>
            </FormField>
            {canFilterUpt ? (
              <FormField id="report-upt" label="UPT">
                <Select
                  id="report-upt"
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
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            caption="Daftar laporan"
            loading={loading}
            loadingLabel="Memuat daftar laporan..."
            error={error ?? undefined}
            onRetry={() => void load()}
            pagination={pagination}
            onPageChange={setPage}
            emptyTitle="Laporan belum tersedia"
            emptyDescription="Belum ada laporan yang sesuai dengan filter saat ini."
          />
        </div>
      )}
    </AppShell>
  );
}
