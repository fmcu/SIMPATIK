"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReportForm } from "@/features/reports/components/report-form";
import { ApiClientError, apiClient, type Report } from "@/lib/api-client";
import { errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

export default function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = useRequireSession();
  const [reportId, setReportId] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const canEdit = auth.session?.user.role === "PETUGAS_UPT";

  useEffect(() => {
    void params.then(({ id }) => setReportId(id));
  }, [params]);

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      setReport(await apiClient.reports.get(reportId));
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.isForbidden) setDenied(true);
      else setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (!canEdit || !reportId) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canEdit, load, reportId]);

  const editable = report?.status === "DRAFT" || report?.status === "REVISION_REQUIRED";

  return (
    <AppShell>
      {!canEdit ? (
        <EmptyState
          title="Akses ditolak"
          description="Hanya Petugas UPT yang dapat mengubah draf laporan."
        />
      ) : loading ? (
        <LoadingState label="Memuat draf laporan..." />
      ) : denied ? (
        <EmptyState
          title="Akses ditolak"
          description="Anda tidak memiliki izin mengubah laporan ini."
        />
      ) : error ? (
        <LoadingState label={error} error onRetry={() => void load()} />
      ) : !report ? (
        <EmptyState
          title="Laporan tidak ditemukan"
          description="Laporan yang diminta belum tersedia."
        />
      ) : !editable ? (
        <EmptyState
          title="Laporan terkunci"
          description="Hanya laporan DRAFT atau REVISION_REQUIRED yang dapat diubah."
          action={
            <Link
              href={`/reports/${report.id}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Eye />
              Lihat detail
            </Link>
          }
        />
      ) : (
        <div className="mx-auto max-w-4xl space-y-8">
          <PageHeader
            eyebrow="Pelaporan"
            title={`Draf ${report.reportType}`}
            description={`${report.period.name} · ${report.upt.code} — ${report.upt.name}`}
            breadcrumbs={[{ label: "Laporan", href: "/reports" }, { label: "Draf" }]}
            actions={
              <Link
                href={`/reports/${report.id}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <ArrowLeft />
                Kembali ke detail
              </Link>
            }
          />
          <ReportForm report={report} onSaved={setReport} />
        </div>
      )}
    </AppShell>
  );
}
