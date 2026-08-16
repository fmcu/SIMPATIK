"use client";

import { useEffect, useState, type FormEvent } from "react";

import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ApiClientError,
  apiClient,
  type ApiFieldError,
  type Report,
  type ReportAttachment,
  type ReportItem,
  type ReportUpdateInput,
  type RequiredDocument,
} from "@/lib/api-client";
import { errorMessage } from "@/lib/admin-helpers";

type ReportFormProps = {
  report: Report;
  onSaved: (report: Report) => void;
};

function inputType(item: ReportItem): "text" | "number" | "date" {
  const type = item.indicator.inputConfig?.type;
  return type === "number" || type === "date" ? type : "text";
}

function attachmentFile(attachment: ReportAttachment): UploadedFile {
  return {
    id: attachment.id,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    createdAt: attachment.createdAt,
  };
}

function inputIdForField(report: Report, field: string): string | null {
  const match = /^items\.(\d+)\.(value|narrative)$/.exec(field);
  if (match) {
    const index = Number(match[1]);
    const item = report.items?.[index];
    return item ? `report-item-${item.id}-${match[2]}` : null;
  }
  const attachmentMatch = /^attachments\.requirements\.(.+)$/.exec(field);
  return attachmentMatch?.[1] ? `attachment-requirement-${attachmentMatch[1]}-trigger` : null;
}

function focusFirstError(report: Report, fields: ApiFieldError[]) {
  const id = fields.map((field) => inputIdForField(report, field.field)).find(Boolean);
  if (!id) return;
  window.requestAnimationFrame(() => document.getElementById(id)?.focus());
}

export function ReportForm({ report, onSaved }: ReportFormProps) {
  const [items, setItems] = useState(report.items ?? []);
  const [version, setVersion] = useState(report.version);
  const [requirements, setRequirements] = useState<RequiredDocument[]>([]);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiClient.documents
      .list(report.periodId)
      .then((result) => {
        if (active) setRequirements(result);
      })
      .catch((loadError) => {
        if (active) setRequirementsError(errorMessage(loadError));
      });
    return () => {
      active = false;
    };
  }, [report.periodId]);

  const visibleRequirements = requirements.filter(
    (requirement) => requirement.required && requirement.approvalStatus === "APPROVED",
  );
  const allFieldErrors = fieldErrors.length ? fieldErrors : (error?.fields ?? []);

  function fieldError(field: string): string | undefined {
    return allFieldErrors.find((item) => item.field === field)?.message;
  }

  function updateItem(index: number, field: "value" | "narrative", value: string) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
    setSavedAt(null);
  }

  function updateAttachments(updater: (attachments: ReportAttachment[]) => ReportAttachment[]) {
    onSaved({ ...report, attachments: updater(report.attachments ?? []) });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) {
      setGeneralError("Tidak ada indikator disahkan untuk periode ini.");
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors([]);
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
        setFieldErrors(saveError.fields);
        if (saveError.fields.length) focusFirstError(report, saveError.fields);
        else setGeneralError(saveError.message);
      } else setGeneralError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function checkCompleteness() {
    setChecking(true);
    setError(null);
    setFieldErrors([]);
    setGeneralError(null);
    try {
      await apiClient.reports.validateCompleteness(report.id);
      setGeneralError("Laporan lengkap. Anda dapat melanjutkan pengajuan melalui Koordinator UPT.");
    } catch (checkError) {
      if (checkError instanceof ApiClientError) {
        setError(checkError);
        setFieldErrors(checkError.fields);
        if (checkError.fields.length) focusFirstError(report, checkError.fields);
        else setGeneralError(checkError.message);
      } else setGeneralError(errorMessage(checkError));
    } finally {
      setChecking(false);
    }
  }

  async function uploadAttachment(
    requirement: RequiredDocument | undefined,
    file: File,
    onProgress: (progress: number) => void,
  ) {
    const reportItemId = requirement?.indicatorId
      ? report.items?.find((item) => item.indicatorId === requirement.indicatorId)?.id
      : undefined;
    const attachment = await apiClient.attachments.upload(
      report.id,
      {
        file,
        ...(reportItemId === undefined ? {} : { reportItemId }),
        ...(requirement?.id === undefined ? {} : { requirementId: requirement.id }),
      },
      onProgress,
    );
    updateAttachments((attachments) => [...attachments, attachment]);
    setFieldErrors((current) =>
      requirement?.id
        ? current.filter((item) => item.field !== `attachments.requirements.${requirement.id}`)
        : current,
    );
  }

  async function deleteAttachment(attachment: UploadedFile) {
    await apiClient.attachments.delete(attachment.id);
    updateAttachments((attachments) => attachments.filter((item) => item.id !== attachment.id));
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
      {allFieldErrors.length ? (
        <section
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-4"
          aria-labelledby="error-summary-title"
          role="alert"
        >
          <h2 id="error-summary-title" className="font-semibold text-destructive">
            Laporan belum lengkap
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
            {allFieldErrors.map((item) => {
              const id = inputIdForField(report, item.field);
              return (
                <li key={`${item.field}-${item.message}`}>
                  {id ? (
                    <a
                      href={`#${id}`}
                      className="underline"
                      onClick={() => document.getElementById(id)?.focus()}
                    >
                      {item.message}
                    </a>
                  ) : (
                    item.message
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {generalError ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="status">
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
            error={fieldError(`items.${index}.value`)}
          >
            <Input
              id={`report-item-${item.id}-value`}
              type={inputType(item)}
              value={item.value ?? ""}
              onChange={(event) => updateItem(index, "value", event.target.value)}
              disabled={saving || checking}
              aria-invalid={Boolean(fieldError(`items.${index}.value`))}
              aria-describedby={
                fieldError(`items.${index}.value`)
                  ? `report-item-${item.id}-value-error`
                  : undefined
              }
            />
          </FormField>
          <FormField
            id={`report-item-${item.id}-narrative`}
            label="Narasi"
            required={item.indicator.required}
            error={fieldError(`items.${index}.narrative`)}
          >
            <Textarea
              id={`report-item-${item.id}-narrative`}
              value={item.narrative ?? ""}
              onChange={(event) => updateItem(index, "narrative", event.target.value)}
              disabled={saving || checking}
              rows={5}
              aria-invalid={Boolean(fieldError(`items.${index}.narrative`))}
              aria-describedby={
                fieldError(`items.${index}.narrative`)
                  ? `report-item-${item.id}-narrative-error`
                  : undefined
              }
            />
          </FormField>
        </section>
      ))}
      <section className="space-y-5 rounded-xl border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">Dokumen wajib</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Unggah bukti untuk setiap dokumen wajib periode ini.
          </p>
        </div>
        {requirementsError ? <p className="text-sm text-destructive">{requirementsError}</p> : null}
        {visibleRequirements.length ? (
          <div className="space-y-5">
            {visibleRequirements.map((requirement) => {
              const attachments = (report.attachments ?? [])
                .filter((attachment) => attachment.requirementId === requirement.id)
                .map(attachmentFile);
              const error = requirement.id
                ? fieldError(`attachments.requirements.${requirement.id}`)
                : undefined;
              return (
                <section key={requirement.id ?? requirement.code} className="rounded-lg border p-4">
                  <FileUpload
                    id={`attachment-requirement-${requirement.id ?? requirement.code}`}
                    accept={requirement.allowedMimeTypes.join(",")}
                    multiple
                    maxSizeBytes={requirement.maxSize}
                    disabled={saving || checking}
                    uploadedFiles={attachments}
                    label={requirement.name}
                    description={`Wajib · Maksimal ${Math.round(requirement.maxSize / 1024 / 1024)} MB.`}
                    onUpload={(file, onProgress) => uploadAttachment(requirement, file, onProgress)}
                    onDownload={(file) => apiClient.attachments.download(file)}
                    onDelete={deleteAttachment}
                    onError={(message) => setGeneralError(message)}
                  />
                  {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
                </section>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tidak ada dokumen wajib untuk periode ini.
          </p>
        )}
      </section>
      <section className="rounded-xl border bg-card p-5">
        <FileUpload
          id="attachment-supporting"
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
          multiple
          maxSizeBytes={10 * 1024 * 1024}
          disabled={saving || checking}
          uploadedFiles={(report.attachments ?? [])
            .filter((attachment) => attachment.requirementId === null)
            .map(attachmentFile)}
          label="Dokumen pendukung tambahan"
          description="PDF, DOCX, XLSX, PNG, atau JPG. Maksimal 10 MB per file."
          onUpload={(file, onProgress) => uploadAttachment(undefined, file, onProgress)}
          onDownload={(file) => apiClient.attachments.download(file)}
          onDelete={deleteAttachment}
          onError={(message) => setGeneralError(message)}
        />
      </section>
      <div className="sticky bottom-4 flex flex-wrap justify-end gap-3 rounded-xl border bg-background/95 p-3 backdrop-blur">
        <Button
          type="button"
          variant="outline"
          disabled={saving || checking || !items.length}
          onClick={() => void checkCompleteness()}
        >
          {checking ? "Memeriksa..." : "Periksa kelengkapan"}
        </Button>
        <Button type="submit" disabled={saving || checking || !items.length}>
          {saving ? "Menyimpan..." : "Simpan draf"}
        </Button>
      </div>
    </form>
  );
}
