"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, Pencil, RotateCcw } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReportHistoryTimeline } from "@/components/shared/report-history-timeline";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiClient, type Report, type ReportAttachment } from "@/lib/api-client";
import { dateLabel, errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

function dateTimeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(date);
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = useRequireSession();
  const [reportId, setReportId] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
   const [reviewError, setReviewError] = useState<string | null>(null);
   const [reviewing, setReviewing] = useState<"comment" | "revision" | "reviewed" | null>(null);
   const [approving, setApproving] = useState(false);


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
    if (!auth.session || !reportId) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [auth.session, load, reportId]);

  const canEdit =
    auth.session?.user.role === "PETUGAS_UPT" &&
    (report?.status === "DRAFT" || report?.status === "REVISION_REQUIRED");
  const canReview = auth.session?.user.role === "PETUGAS_KANWIL" && report?.status === "SUBMITTED";
  const canApprove = auth.session?.user.role === "PRODUCT_OWNER" && report?.status === "REVIEWED";

  async function approveReport() {
    if (!report) return;
    setApproving(true);
    try {
      await apiClient.reports.approve(report.id);
      await load();
    } finally {
      setApproving(false);
    }
  }

  async function submitReview(action: "comment" | "revision" | "reviewed") {
    const message = reviewNote.trim();
    if (!report || ((action === "comment" || action === "revision") && !message)) {
      setReviewError("Catatan reviu wajib diisi.");
      return;
    }
    setReviewing(action);
    setReviewError(null);
    try {
      if (action === "comment") await apiClient.reports.addReviewComment(report.id, { message });
      else if (action === "revision") await apiClient.reports.requestRevision(report.id, { message });
      else await apiClient.reports.markReviewed(report.id);
      setReviewNote("");
      await load();
    } catch (reviewActionError) {
      setReviewError(errorMessage(reviewActionError));
    } finally {
      setReviewing(null);
    }
  }

  async function downloadAttachment(attachment: ReportAttachment) {
    setDownloading(attachment.id);
    try {
      await apiClient.attachments.download(attachment);
    } catch (downloadError) {
      setError(errorMessage(downloadError));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <AppShell>
      {loading ? (
        <LoadingState label="Memuat detail laporan..." />
      ) : denied ? (
        <EmptyState
          title="Akses ditolak"
          description="Anda tidak memiliki izin melihat laporan ini."
        />
      ) : error ? (
        <LoadingState label={error} error onRetry={() => void load()} />
      ) : !report ? (
        <EmptyState
          title="Laporan tidak ditemukan"
          description="Laporan yang diminta belum tersedia."
        />
      ) : (
        <div className="space-y-8">
          <PageHeader
            eyebrow="Pelaporan"
            title={report.reportType}
            description={`${report.period.name} · ${report.upt.code} — ${report.upt.name}`}
            breadcrumbs={[{ label: "Laporan", href: "/reports" }, { label: report.reportType }]}
            actions={
              <>
                <Link
                  href="/reports"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <ArrowLeft />
                  Kembali
                </Link>
                 {canEdit ? (
                   <Link
                     href={`/reports/${report.id}/edit`}
                     className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                   >
                     <Pencil />
                     Ubah draf
                   </Link>
                 ) : null}
                 {canApprove ? (
                   <ConfirmDialog
                     trigger={
                       <Button type="button">
                         <CheckCircle2 />
                         Setujui laporan
                       </Button>
                     }

                     title="Setujui laporan?"
                     description="Laporan akan menjadi data resmi dan tidak dapat diedit, dihapus, dikembalikan, atau diubah statusnya melalui alur biasa."
                     confirmLabel="Ya, setujui laporan"
                     loading={approving}
                     onConfirm={approveReport}
                   />
                 ) : null}
               </>
             }
           />

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-3">
                <StatusBadge status={report.status} />
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">UPT</p>
              <p className="mt-3 font-semibold">{report.upt.code}</p>
              <p className="text-sm text-muted-foreground">{report.upt.name}</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Dibuat oleh</p>
              <p className="mt-3 font-semibold">{report.createdBy.name}</p>
              <p className="text-sm text-muted-foreground">{dateTimeLabel(report.createdAt)}</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Terakhir diperbarui</p>
              <p className="mt-3 font-semibold">{dateTimeLabel(report.updatedAt)}</p>
              <p className="text-sm text-muted-foreground">
                Diajukan: {dateTimeLabel(report.submittedAt)}
              </p>
               {report.reviewedAt ? (
                 <p className="text-sm text-muted-foreground">
                   Direviu: {dateTimeLabel(report.reviewedAt)}
                   {report.reviewedBy ? ` oleh ${report.reviewedBy.name}` : ""}
                 </p>
               ) : null}
               {report.approvedAt ? (
                 <p className="text-sm text-muted-foreground">
                   Disetujui: {dateTimeLabel(report.approvedAt)}
                   {report.approvedBy ? ` oleh ${report.approvedBy.name}` : ""}
                 </p>
               ) : null}

            </div>
          </section>
          {canReview ? (
            <form
              className="space-y-5 rounded-xl border bg-card p-6"
              onSubmit={(event) => {
                event.preventDefault();
                void submitReview("comment");
              }}
              noValidate
            >
              <div>
                <h2 className="text-lg font-semibold">Reviu laporan</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tambahkan catatan untuk reviu atau sebagai alasan permintaan revisi.
                </p>
              </div>
              {reviewError ? (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  {reviewError}
                </p>
              ) : null}
              <FormField id="review-note" label="Catatan reviu" required error={undefined}>
                <Textarea
                  id="review-note"
                  value={reviewNote}
                  onChange={(event) => {
                    setReviewNote(event.target.value);
                    if (reviewError) setReviewError(null);
                  }}
                  disabled={Boolean(reviewing)}
                  required
                  aria-invalid={Boolean(reviewError)}
                />
              </FormField>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="submit" variant="outline" disabled={Boolean(reviewing)}>
                  {reviewing === "comment" ? "Menyimpan..." : "Simpan catatan"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(reviewing)}
                  onClick={() => void submitReview("revision")}
                >
                  <RotateCcw />
                  {reviewing === "revision" ? "Meminta revisi..." : "Minta revisi"}
                </Button>
                <Button
                  type="button"
                  disabled={Boolean(reviewing)}
                  onClick={() => void submitReview("reviewed")}
                >
                  <CheckCircle2 />
                  {reviewing === "reviewed" ? "Menyimpan..." : "Tandai selesai direviu"}
                </Button>
              </div>
            </form>
          ) : null}
          <section className="space-y-4 rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Indikator</h2>
            {report.items?.length ? (
              <div className="space-y-4">
                {report.items.map((item) => (
                  <article key={item.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{item.indicator.code}</p>
                        <h3 className="mt-1 font-semibold">{item.indicator.name}</h3>
                      </div>
                      {item.indicator.required ? (
                        <span className="text-sm text-destructive">Wajib</span>
                      ) : null}
                    </div>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm text-muted-foreground">Nilai atau capaian</dt>
                        <dd className="mt-1 whitespace-pre-wrap font-medium">
                          {item.value || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Narasi</dt>
                        <dd className="mt-1 whitespace-pre-wrap">{item.narrative || "—"}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada indikator pada laporan ini.</p>
            )}
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold">Lampiran</h2>
              {report.attachments?.length ? (
                <ul className="mt-4 space-y-3">
                  {report.attachments.map((attachment) => (
                      <li key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{attachment.originalName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {attachment.mimeType} · {attachment.size.toLocaleString("id-ID")} byte ·{" "}
                            {dateTimeLabel(attachment.createdAt)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={downloading === attachment.id}
                          onClick={() => void downloadAttachment(attachment)}
                        >
                          <Download />
                          {downloading === attachment.id ? "Mengunduh..." : "Unduh"}
                        </Button>
                      </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Belum ada lampiran.</p>
              )}
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold">Catatan reviu</h2>
              {report.comments?.length ? (
                <ul className="mt-4 space-y-3">
                  {report.comments.map((comment) => (
                    <li key={comment.id} className="rounded-lg border p-3">
                      <p className="whitespace-pre-wrap">{comment.message}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {comment.createdBy.name} · {dateTimeLabel(comment.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Belum ada catatan reviu.</p>
              )}
            </div>
          </section>
           <section className="rounded-xl border bg-card p-6">
             <h2 className="text-lg font-semibold">Histori status</h2>
             <ReportHistoryTimeline histories={report.histories ?? []} />
             <p className="mt-5 text-sm text-muted-foreground">
               Periode: {report.period.name} · Tenggat {dateLabel(report.period.dueDate)}
             </p>
           </section>

        </div>
      )}
    </AppShell>
  );
}
