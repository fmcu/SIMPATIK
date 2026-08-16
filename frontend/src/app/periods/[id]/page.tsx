"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, FileText, ListChecks } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApiClientError, apiClient, type Period } from "@/lib/api-client";
import { dateLabel, errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

export default function PeriodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = useRequireSession();
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    void params.then(({ id }) => setPeriodId(id));
  }, [params]);

  const load = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      setPeriod(await apiClient.periods.get(periodId));
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.isForbidden) setDenied(true);
      else setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    if (!auth.session || !periodId) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [auth.session, load, periodId]);

  const canConfigure =
    auth.session?.user.role === "ADMIN_SIMPATIK" || auth.session?.user.role === "PRODUCT_OWNER";

  return (
    <AppShell>
      {loading ? (
        <LoadingState label="Memuat detail periode..." />
      ) : denied ? (
        <EmptyState
          title="Akses ditolak"
          description="Anda tidak memiliki izin melihat detail periode."
        />
      ) : error ? (
        <LoadingState label={error} error onRetry={() => void load()} />
      ) : !period || !periodId ? (
        <EmptyState
          title="Periode tidak ditemukan"
          description="Periode yang diminta belum tersedia."
        />
      ) : (
        <div className="space-y-8">
          <PageHeader
            eyebrow="Master data"
            title={period.name}
            description="Ringkasan status periode, indikator, dan dokumen wajib."
            breadcrumbs={[{ label: "Periode", href: "/periods" }, { label: period.name }]}
            actions={
              canConfigure ? (
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={`/periods/${period.id}/indicators`}
                >
                  Konfigurasi indikator
                  <ArrowRight />
                </Link>
              ) : undefined
            }
          />
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Status periode</p>
                <CalendarDays className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div className="mt-4">
                <StatusBadge status={period.status} />
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Tanggal mulai</p>
                <CalendarDays className="size-5 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-4 text-lg font-semibold">{dateLabel(period.startDate)}</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Tenggat</p>
                <CalendarDays className="size-5 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-4 text-lg font-semibold">{dateLabel(period.dueDate)}</p>
            </div>
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ListChecks className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Indikator</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {period.indicators?.length ?? 0} indikator terkonfigurasi.
                  </p>
                </div>
              </div>
              {period.indicators?.length ? (
                <ul className="mt-5 space-y-3">
                  {period.indicators.slice(0, 5).map((indicator) => (
                    <li
                      key={indicator.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                    >
                      <span>
                        <span className="font-semibold">{indicator.code}</span>
                        <span className="ml-2 text-muted-foreground">{indicator.name}</span>
                      </span>
                      <StatusBadge status={indicator.approvalStatus ?? "PENDING"} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">Belum ada indikator.</p>
              )}
              {canConfigure ? (
                <Link
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={`/periods/${period.id}/indicators`}
                >
                  Kelola indikator dan dokumen
                </Link>
              ) : null}
            </div>
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Dokumen wajib</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {period.requiredDocuments?.length ?? 0} dokumen periode terkonfigurasi.
                  </p>
                </div>
              </div>
              {period.requiredDocuments?.length ? (
                <ul className="mt-5 space-y-3">
                  {period.requiredDocuments.slice(0, 5).map((document) => (
                    <li
                      key={document.id ?? document.code}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                    >
                      <span>
                        <span className="font-semibold">{document.code}</span>
                        <span className="ml-2 text-muted-foreground">{document.name}</span>
                      </span>
                      <StatusBadge status={document.approvalStatus ?? "PENDING"} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">
                  Belum ada dokumen wajib tingkat periode.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
