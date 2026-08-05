"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiClient, type ApiFieldError, type Report } from "@/lib/api-client";
import { dateLabel, errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

const emptyPagination = { page: 1, pageSize: 100, total: 0, totalPages: 0 };
const submitStatuses = new Set(["DRAFT", "REVISION_REQUIRED"]);

export default function ReportValidationPage() {
  const auth = useRequireSession();
  const canValidate = auth.session?.user.role === "KOORDINATOR_UPT";
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmationReport, setConfirmationReport] = useState<Report | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.reports.list({ page: 1, pageSize: 100 });
      setReports(result.data.filter((report) => submitStatuses.has(report.status)));
      setPagination(result.pagination);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canValidate) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canValidate, load]);

  async function validateBeforeSubmit(report: Report) {
    setValidatingId(report.id);
    setError(null);
    setValidationErrors([]);
    try {
      await apiClient.reports.validateCompleteness(report.id);
      setConfirmationReport(report);
    } catch (validationError) {
      if (validationError instanceof ApiClientError) setValidationErrors(validationError.fields);
      setError(errorMessage(validationError));
    } finally {
      setValidatingId(null);
    }
  }

  async function submit() {
    if (!confirmationReport) return;
    setSubmittingId(confirmationReport.id);
    setError(null);
    setValidationErrors([]);
    try {
      const submitted = await apiClient.reports.submit(confirmationReport.id);
      setReports((current) => current.filter((report) => report.id !== submitted.id));
      setConfirmationReport(null);
    } catch (submitError) {
      if (submitError instanceof ApiClientError && submitError.code === "VALIDATION_ERROR") {
        setValidationErrors(submitError.fields);
        setConfirmationReport(null);
      }
      setError(errorMessage(submitError));
      throw submitError;
    } finally {
      setSubmittingId(null);
    }
  }

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
      id: "status",
      header: "Status",
      cell: (report) => <StatusBadge status={report.status} />,
    },
    {
      id: "updated",
      header: "Diperbarui",
      cell: (report) => dateLabel(report.updatedAt),
    },
    {
      id: "actions",
      header: "Aksi",
      className: "text-right",
      cell: (report) => (
        <div className="flex justify-end gap-2">
          <Link
            href={`/reports/${report.id}`}
            className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Eye />
            Periksa
          </Link>
          <Button
            type="button"
            size="sm"
            disabled={validatingId === report.id || submittingId === report.id}
            onClick={() => void validateBeforeSubmit(report)}
          >
            <CheckCircle2 />
            {validatingId === report.id ? "Memeriksa..." : "Ajukan"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      {!canValidate ? (
        <section className="rounded-xl border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hanya Koordinator UPT yang dapat memvalidasi dan mengajukan laporan.
          </p>
        </section>
      ) : (
        <div className="space-y-8">
          <PageHeader
            eyebrow="Pelaporan"
            title="Antrean validasi"
            description="Periksa kelengkapan laporan UPT Anda sebelum mengajukannya ke Kanwil."
          />
          {error ? (
            <section
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              <p>{error}</p>
              {validationErrors.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {validationErrors.map((field) => (
                    <li key={`${field.field}-${field.message}`}>{field.message}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
          <DataTable
            columns={columns}
            data={reports}
            getRowId={(report) => report.id}
            caption="Antrean validasi laporan UPT"
            loading={loading}
            loadingLabel="Memuat antrean validasi..."
            error={undefined}
            onRetry={() => void load()}
            pagination={pagination}
            emptyTitle="Tidak ada laporan untuk diajukan"
            emptyDescription="Laporan DRAFT atau REVISION_REQUIRED UPT Anda akan tampil di sini."
          />
          <ConfirmDialog
            open={Boolean(confirmationReport)}
            onOpenChange={(open) => {
              if (!open) setConfirmationReport(null);
            }}
            trigger={<span className="hidden" />}
            title="Ajukan laporan ke Kanwil?"
            description="Laporan akan dikunci selama proses reviu. Petugas UPT tidak dapat mengubah isi atau menghapus lampiran sampai laporan dikembalikan untuk revisi."
            confirmLabel="Ya, ajukan laporan"
            loading={submittingId === confirmationReport?.id}
            onConfirm={submit}
          />
        </div>
      )}
    </AppShell>
  );
}
