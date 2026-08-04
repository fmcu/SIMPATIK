"use client";

import { useState, type FormEvent } from "react";

import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ApiClientError,
  apiClient,
  type Report,
  type ReportItem,
  type ReportUpdateInput,
} from "@/lib/api-client";
import { errorMessage } from "@/lib/admin-helpers";

type ReportFormProps = {
  report: Report;
  onSaved: (report: Report) => void;
};

function fieldError(error: ApiClientError | null, field: string): string | undefined {
  return error?.fields.find((item) => item.field === field)?.message;
}

function inputType(item: ReportItem): "text" | "number" | "date" {
  const type = item.indicator.inputConfig?.type;
  return type === "number" || type === "date" ? type : "text";
}

export function ReportForm({ report, onSaved }: ReportFormProps) {
  const [items, setItems] = useState(report.items ?? []);
  const [version, setVersion] = useState(report.version);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function updateItem(index: number, field: "value" | "narrative", value: string) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
    setSavedAt(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) {
      setGeneralError("Tidak ada indikator disahkan untuk periode ini.");
      return;
    }
    setSaving(true);
    setError(null);
    setGeneralError(null);
    try {
      const body: ReportUpdateInput = {
        version,
        items: items.map((item) => ({
          indicatorId: item.indicatorId,
          value: item.value?.trim() ? item.value : null,
          narrative: item.narrative?.trim() ? item.narrative : null,
        })),
      };
      const saved = await apiClient.reports.update(report.id, body);
      setItems(saved.items ?? []);
      setVersion(saved.version);
      setSavedAt(
        new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        }).format(new Date(saved.updatedAt)),
      );
      onSaved(saved);
    } catch (saveError) {
      if (saveError instanceof ApiClientError) {
        setError(saveError);
        if (!saveError.fields.length) setGeneralError(saveError.message);
      } else setGeneralError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={save} noValidate>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">Status penyimpanan</p>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {saving
              ? "Menyimpan draf..."
              : savedAt
                ? `Tersimpan ${savedAt}`
                : "Perubahan belum disimpan."}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </section>
      {generalError ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {generalError}
        </p>
      ) : null}
      {!items.length ? (
        <section className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Periode ini belum memiliki indikator yang disahkan.
        </section>
      ) : null}
      {items.map((item, index) => (
        <section key={item.id} className="space-y-5 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{item.indicator.code}</p>
              <h2 className="mt-1 text-lg font-semibold">{item.indicator.name}</h2>
            </div>
            {item.indicator.required ? (
              <span className="text-sm font-medium text-destructive">Wajib diisi</span>
            ) : null}
          </div>
          <FormField
            id={`report-item-${item.id}-value`}
            label="Nilai atau capaian"
            required={item.indicator.required}
            description={
              typeof item.indicator.inputConfig?.unit === "string"
                ? `Satuan: ${item.indicator.inputConfig.unit}`
                : undefined
            }
            error={fieldError(error, `items.${index}.value`)}
          >
            <Input
              id={`report-item-${item.id}-value`}
              type={inputType(item)}
              value={item.value ?? ""}
              onChange={(event) => updateItem(index, "value", event.target.value)}
              disabled={saving}
              aria-describedby={
                fieldError(error, `items.${index}.value`)
                  ? `report-item-${item.id}-value-error`
                  : undefined
              }
            />
          </FormField>
          <FormField
            id={`report-item-${item.id}-narrative`}
            label="Narasi"
            error={fieldError(error, `items.${index}.narrative`)}
          >
            <Textarea
              id={`report-item-${item.id}-narrative`}
              value={item.narrative ?? ""}
              onChange={(event) => updateItem(index, "narrative", event.target.value)}
              disabled={saving}
              rows={5}
              aria-describedby={
                fieldError(error, `items.${index}.narrative`)
                  ? `report-item-${item.id}-narrative-error`
                  : undefined
              }
            />
          </FormField>
        </section>
      ))}
      <div className="sticky bottom-4 flex justify-end rounded-xl border bg-background/95 p-3 backdrop-blur">
        <Button type="submit" disabled={saving || !items.length}>
          {saving ? "Menyimpan..." : "Simpan draf"}
        </Button>
      </div>
    </form>
  );
}
