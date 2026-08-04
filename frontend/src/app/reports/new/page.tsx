"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { FormField } from "@/components/shared/form-field";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiClientError, apiClient, type Period } from "@/lib/api-client";
import { errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

export default function NewReportPage() {
  const auth = useRequireSession();
  const router = useRouter();
  const canCreate = auth.session?.user.role === "PETUGAS_UPT";
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [reportType, setReportType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.periods.list({ page: 1, pageSize: 100, status: "ACTIVE" });
      setPeriods(result.data);
      if (result.data.length === 1) setPeriodId(result.data[0].id);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canCreate) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canCreate, load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!periodId || !reportType.trim()) {
      setFieldErrors({
        ...(periodId ? {} : { periodId: "Periode wajib dipilih." }),
        ...(reportType.trim() ? {} : { reportType: "Tipe laporan wajib diisi." }),
      });
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const report = await apiClient.reports.create({ periodId, reportType: reportType.trim() });
      router.replace(`/reports/${report.id}/edit`);
    } catch (createError) {
      if (createError instanceof ApiClientError) {
        setFieldErrors(
          Object.fromEntries(createError.fields.map((item) => [item.field, item.message])),
        );
      }
      setError(errorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {!canCreate ? (
        <section className="rounded-xl border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hanya Petugas UPT yang dapat membuat draf laporan.
          </p>
        </section>
      ) : loading ? (
        <LoadingState label="Memuat periode aktif..." />
      ) : (
        <div className="mx-auto max-w-2xl space-y-8">
          <PageHeader
            eyebrow="Pelaporan"
            title="Buat draf laporan"
            description="Pilih periode aktif dan tipe laporan. Indikator yang telah disahkan akan dimuat ke draf."
            breadcrumbs={[{ label: "Laporan", href: "/reports" }, { label: "Buat draf" }]}
          />
          <form className="space-y-5 rounded-xl border bg-card p-6" onSubmit={create} noValidate>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <FormField id="report-period" label="Periode" required error={fieldErrors.periodId}>
              <Select
                id="report-period"
                value={periodId}
                onChange={(event) => setPeriodId(event.target.value)}
                disabled={saving}
                aria-invalid={Boolean(fieldErrors.periodId)}
              >
                <option value="">Pilih periode aktif</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id="report-type"
              label="Tipe laporan"
              required
              description="Gunakan tipe laporan yang telah ditetapkan organisasi."
              error={fieldErrors.reportType}
            >
              <Input
                id="report-type"
                value={reportType}
                onChange={(event) => setReportType(event.target.value)}
                disabled={saving}
                maxLength={100}
                aria-invalid={Boolean(fieldErrors.reportType)}
              />
            </FormField>
            {!periods.length ? (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Belum ada periode ACTIVE. Hubungi Admin SIMPATIK.
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/reports")}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving || !periods.length}>
                {saving ? "Membuat draf..." : "Buat draf"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
