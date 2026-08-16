"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ChevronDown, Edit3, Plus } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ApiClientError,
  apiClient,
  type Indicator,
  type IndicatorInput,
  type Period,
  type RequiredDocument,
  type RequiredDocumentInput,
} from "@/lib/api-client";
import { errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

type IndicatorInputType = "text" | "number" | "date";

const documentFileTypeOptions = [
  { value: "application/pdf", label: "PDF", extension: ".pdf" },
  {
    value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "Microsoft Word",
    extension: ".docx",
  },
  {
    value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    label: "Microsoft Excel",
    extension: ".xlsx",
  },
  { value: "image/png", label: "Gambar PNG", extension: ".png" },
  { value: "image/jpeg", label: "Gambar JPG", extension: ".jpg, .jpeg" },
] as const;

const initialIndicator: IndicatorInput = {
  code: "",
  name: "",
  required: false,
  order: 0,
  inputConfig: {},
};

const initialDocument: RequiredDocumentInput = {
  code: "",
  name: "",
  required: true,
  allowedMimeTypes: [],
  maxSize: 10 * 1024 * 1024,
  order: 0,
};

function listValue<T>(value: T[] | { items?: T[]; data?: T[] } | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.items ?? value?.data ?? [];
}

function inputTypeFromConfig(inputConfig?: Record<string, unknown> | null): IndicatorInputType {
  const type = inputConfig?.type;
  return type === "number" || type === "date" ? type : "text";
}

function inputTypeLabel(inputConfig?: Record<string, unknown> | null): string {
  const type = inputTypeFromConfig(inputConfig);
  if (type === "number") return "Angka";
  if (type === "date") return "Tanggal";
  return "Teks";
}

function documentFileTypeLabel(mimeType: string): string {
  return documentFileTypeOptions.find((option) => option.value === mimeType)?.label ?? mimeType;
}

function documentFileTypeSummary(mimeTypes: string[]): string {
  if (!mimeTypes.length) return "Pilih tipe file";
  if (mimeTypes.length <= 2) return mimeTypes.map(documentFileTypeLabel).join(", ");
  return `${mimeTypes.length} tipe file dipilih`;
}

export default function PeriodIndicatorsPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = useRequireSession();
  const role = auth.session?.user.role;
  const canAccess = role === "ADMIN_SIMPATIK" || role === "PRODUCT_OWNER";
  const canEdit = role === "ADMIN_SIMPATIK";
  const canApprove = role === "PRODUCT_OWNER";
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [indicatorDialog, setIndicatorDialog] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
  const [editingDocument, setEditingDocument] = useState<RequiredDocument | null>(null);
  const [indicatorForm, setIndicatorForm] = useState<IndicatorInput>(initialIndicator);
  const [indicatorInputType, setIndicatorInputType] = useState<IndicatorInputType>("text");
  const [indicatorUnit, setIndicatorUnit] = useState("");
  const [documentForm, setDocumentForm] = useState<RequiredDocumentInput>(initialDocument);
  const [documentMimeTypes, setDocumentMimeTypes] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approvalId, setApprovalId] = useState<string | null>(null);

  useEffect(() => {
    void params.then(({ id }) => setPeriodId(id));
  }, [params]);

  const load = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const [periodResult, indicatorResult, documentResult] = await Promise.all([
        apiClient.periods.get(periodId),
        apiClient.indicators.list(periodId),
        apiClient.documents.list(periodId),
      ]);
      setPeriod(periodResult);
      setIndicators(listValue(indicatorResult));
      setDocuments(listValue(documentResult));
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.isForbidden) setDenied(true);
      else setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    if (!canAccess || !periodId) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canAccess, load, periodId]);

  function openIndicator(row?: Indicator) {
    setEditingIndicator(row ?? null);
    setIndicatorForm(
      row
        ? {
            code: row.code,
            name: row.name,
            required: row.required,
            order: row.order,
            inputConfig: row.inputConfig ?? {},
          }
        : { ...initialIndicator },
    );
    setIndicatorInputType(inputTypeFromConfig(row?.inputConfig));
    setIndicatorUnit(typeof row?.inputConfig?.unit === "string" ? row.inputConfig.unit : "");
    setFormError(null);
    setIndicatorDialog(true);
  }

  function openDocument(row?: RequiredDocument) {
    setEditingDocument(row ?? null);
    setDocumentForm(
      row
        ? {
            code: row.code,
            name: row.name,
            required: row.required,
            allowedMimeTypes: row.allowedMimeTypes,
            maxSize: row.maxSize,
            order: row.order,
            ...(row.indicatorId
              ? { indicatorId: row.indicatorId }
              : { periodId: periodId ?? undefined }),
          }
        : { ...initialDocument, periodId: periodId ?? undefined },
    );
    setDocumentMimeTypes([...new Set(row?.allowedMimeTypes ?? [])]);
    setFormError(null);
    setDocumentDialog(true);
  }

  async function saveIndicator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!indicatorForm.code.trim() || !indicatorForm.name.trim()) {
      setFormError("Kode dan nama indikator wajib diisi.");
      return;
    }
    const inputConfig: Record<string, unknown> = { ...(editingIndicator?.inputConfig ?? {}) };
    inputConfig.type = indicatorInputType;
    const unit = indicatorUnit.trim();
    if (unit) inputConfig.unit = unit;
    else delete inputConfig.unit;
    setSaving(true);
    setFormError(null);
    try {
      const body: IndicatorInput = {
        ...indicatorForm,
        code: indicatorForm.code.trim(),
        name: indicatorForm.name.trim(),
        order: Number(indicatorForm.order),
        inputConfig,
      };
      if (editingIndicator) await apiClient.indicators.update(editingIndicator.id, body);
      else if (periodId) await apiClient.indicators.create(periodId, body);
      setIndicatorDialog(false);
      await load();
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function saveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentForm.code.trim() || !documentForm.name.trim()) {
      setFormError("Kode dan nama dokumen wajib diisi.");
      return;
    }
    if (!editingDocument && !documentForm.periodId && !documentForm.indicatorId) {
      setFormError("Pilih cakupan periode atau indikator.");
      return;
    }
    const allowedMimeTypes = [...new Set(documentMimeTypes)];
    if (!allowedMimeTypes.length) {
      setFormError("Minimal satu tipe file yang diizinkan wajib diisi.");
      return;
    }
    if (!Number.isInteger(Number(documentForm.maxSize)) || Number(documentForm.maxSize) <= 0) {
      setFormError("Batas ukuran file harus berupa bilangan positif.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body: RequiredDocumentInput = {
        code: documentForm.code.trim(),
        name: documentForm.name.trim(),
        required: documentForm.required,
        allowedMimeTypes,
        maxSize: Number(documentForm.maxSize),
        order: Number(documentForm.order),
        ...(editingDocument
          ? {}
          : documentForm.indicatorId
            ? { indicatorId: documentForm.indicatorId }
            : { periodId: periodId ?? undefined }),
      };
      if (editingDocument?.id) await apiClient.documents.update(editingDocument.id, body);
      else if (periodId) await apiClient.documents.create(periodId, body);
      setDocumentDialog(false);
      await load();
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function approve(kind: "indicator" | "document", id: string) {
    setApprovalId(id);
    try {
      if (kind === "indicator") await apiClient.indicators.approve(id);
      else await apiClient.documents.approve(id);
      await load();
    } catch (approvalError) {
      setError(errorMessage(approvalError));
    } finally {
      setApprovalId(null);
    }
  }

  function toggleDocumentMimeType(mimeType: string, checked: boolean) {
    setDocumentMimeTypes((current) => {
      if (checked) return current.includes(mimeType) ? current : [...current, mimeType];
      return current.filter((value) => value !== mimeType);
    });
  }

  const indicatorColumns: DataTableColumn<Indicator>[] = [
    {
      id: "code",
      header: "Kode",
      cell: (row) => <span className="font-semibold">{row.code}</span>,
    },
    { id: "name", header: "Indikator", cell: (row) => row.name },
    {
      id: "inputType",
      header: "Jenis jawaban",
      cell: (row) => {
        const unit = typeof row.inputConfig?.unit === "string" ? row.inputConfig.unit : "";
        return unit
          ? `${inputTypeLabel(row.inputConfig)} (${unit})`
          : inputTypeLabel(row.inputConfig);
      },
    },
    { id: "required", header: "Wajib", cell: (row) => (row.required ? "Ya" : "Tidak") },
    { id: "order", header: "Urutan", cell: (row) => row.order },
    {
      id: "status",
      header: "Pengesahan",
      cell: (row) => <StatusBadge status={row.approvalStatus ?? "PENDING"} />,
    },
    {
      id: "actions",
      header: "Aksi",
      className: "text-right",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          {canEdit && period?.status === "DRAFT" && row.approvalStatus !== "APPROVED" ? (
            <Button type="button" variant="outline" size="sm" onClick={() => openIndicator(row)}>
              <Edit3 />
              Edit
            </Button>
          ) : null}
          {canApprove && row.approvalStatus !== "APPROVED" ? (
            <ConfirmDialog
              trigger={
                <Button type="button" size="sm">
                  <Check />
                  Sahkan
                </Button>
              }
              title="Sahkan indikator?"
              description={`${row.code} — ${row.name} akan disahkan.`}
              confirmLabel="Sahkan"
              loading={approvalId === row.id}
              onConfirm={() => approve("indicator", row.id)}
            />
          ) : null}
        </div>
      ),
    },
  ];

  const documentColumns: DataTableColumn<RequiredDocument>[] = [
    {
      id: "code",
      header: "Kode",
      cell: (row) => <span className="font-semibold">{row.code}</span>,
    },
    { id: "name", header: "Dokumen", cell: (row) => row.name },
    {
      id: "scope",
      header: "Cakupan",
      cell: (row) =>
        row.indicatorId
          ? (indicators.find((indicator) => indicator.id === row.indicatorId)?.code ?? "Indikator")
          : "Periode",
    },
    {
      id: "types",
      header: "Tipe file",
      cell: (row) => row.allowedMimeTypes.map(documentFileTypeLabel).join(", "),
    },
    { id: "required", header: "Wajib", cell: (row) => (row.required ? "Ya" : "Tidak") },
    {
      id: "status",
      header: "Pengesahan",
      cell: (row) => <StatusBadge status={row.approvalStatus ?? "PENDING"} />,
    },
    {
      id: "actions",
      header: "Aksi",
      className: "text-right",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          {canEdit && period?.status === "DRAFT" && row.approvalStatus !== "APPROVED" ? (
            <Button type="button" variant="outline" size="sm" onClick={() => openDocument(row)}>
              <Edit3 />
              Edit
            </Button>
          ) : null}
          {canApprove && row.approvalStatus !== "APPROVED" && row.id ? (
            <ConfirmDialog
              trigger={
                <Button type="button" size="sm">
                  <Check />
                  Sahkan
                </Button>
              }
              title="Sahkan dokumen wajib?"
              description={`${row.code} — ${row.name} akan disahkan.`}
              confirmLabel="Sahkan"
              loading={approvalId === row.id}
              onConfirm={() => approve("document", row.id as string)}
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      {!canAccess ? (
        <EmptyState
          title="Akses ditolak"
          description="Konfigurasi indikator hanya tersedia untuk Admin SIMPATIK dan Product Owner."
        />
      ) : loading ? (
        <LoadingState label="Memuat konfigurasi periode..." />
      ) : denied ? (
        <EmptyState
          title="Akses ditolak"
          description="Anda tidak memiliki izin melihat konfigurasi periode."
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
            eyebrow="Konfigurasi periode"
            title={period.name}
            description="Kelola indikator, dokumen wajib, serta proses pengesahan Product Owner."
            breadcrumbs={[
              { label: "Periode", href: "/periods" },
              { label: period.name, href: `/periods/${period.id}` },
              { label: "Indikator dan dokumen" },
            ]}
            actions={
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                href={`/periods/${period.id}`}
              >
                <ArrowLeft />
                Kembali ke detail
              </Link>
            }
          />
          <section className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Status periode</p>
                <div className="mt-2">
                  <StatusBadge status={period.status} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {canEdit
                  ? "Admin dapat mengubah konfigurasi saat periode masih DRAFT."
                  : "Product Owner dapat mengesahkan konfigurasi yang menunggu persetujuan."}
              </p>
            </div>
          </section>
          <section className="space-y-4">
            <PageHeader
              title="Indikator"
              description="Item pelaporan beserta jenis jawaban yang harus diisi oleh UPT."
              actions={
                canEdit && period.status === "DRAFT" ? (
                  <Button type="button" onClick={() => openIndicator()}>
                    <Plus />
                    Tambah indikator
                  </Button>
                ) : undefined
              }
            />
            <DataTable
              columns={indicatorColumns}
              data={indicators}
              getRowId={(row) => row.id}
              caption="Daftar indikator"
              emptyTitle="Indikator belum tersedia"
              emptyDescription="Tambahkan indikator untuk mulai mengonfigurasi periode."
            />
          </section>
          <section className="space-y-4">
            <PageHeader
              title="Dokumen wajib"
              description="Dokumen pendukung, tipe file, batas ukuran, dan cakupan validasi laporan."
              actions={
                canEdit && period.status === "DRAFT" ? (
                  <Button type="button" onClick={() => openDocument()}>
                    <Plus />
                    Tambah dokumen
                  </Button>
                ) : undefined
              }
            />
            <DataTable
              columns={documentColumns}
              data={documents}
              getRowId={(row) => row.id ?? row.code}
              caption="Daftar dokumen wajib"
              emptyTitle="Dokumen wajib belum tersedia"
              emptyDescription="Tambahkan dokumen wajib tingkat periode atau indikator."
            />
          </section>
          <Dialog open={indicatorDialog} onOpenChange={setIndicatorDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingIndicator ? "Ubah indikator" : "Tambah indikator"}
                </DialogTitle>
                <DialogDescription>
                  Indikator hanya dapat dikonfigurasi pada periode DRAFT.
                </DialogDescription>
              </DialogHeader>
              <Form onSubmit={saveIndicator} noValidate>
                {formError ? (
                  <p
                    className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : null}
                <FormField id="indicator-code" label="Kode" required>
                  <Input
                    id="indicator-code"
                    value={indicatorForm.code}
                    onChange={(event) =>
                      setIndicatorForm((current) => ({ ...current, code: event.target.value }))
                    }
                    disabled={saving}
                  />
                </FormField>
                <FormField id="indicator-name" label="Nama indikator" required>
                  <Input
                    id="indicator-name"
                    value={indicatorForm.name}
                    onChange={(event) =>
                      setIndicatorForm((current) => ({ ...current, name: event.target.value }))
                    }
                    disabled={saving}
                  />
                </FormField>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField id="indicator-order" label="Urutan" required>
                    <Input
                      id="indicator-order"
                      type="number"
                      min="0"
                      value={indicatorForm.order}
                      onChange={(event) =>
                        setIndicatorForm((current) => ({
                          ...current,
                          order: Number(event.target.value),
                        }))
                      }
                      disabled={saving}
                    />
                  </FormField>
                  <label
                    className="flex items-center gap-3 self-end pb-2 text-sm font-medium"
                    htmlFor="indicator-required"
                  >
                    <Checkbox
                      id="indicator-required"
                      checked={indicatorForm.required}
                      onChange={(event) =>
                        setIndicatorForm((current) => ({
                          ...current,
                          required: event.target.checked,
                        }))
                      }
                      disabled={saving}
                    />
                    Indikator wajib
                  </label>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    id="indicator-input-type"
                    label="Jenis jawaban"
                    required
                    description="Pilih bentuk jawaban yang harus diisi oleh UPT."
                  >
                    <Select
                      id="indicator-input-type"
                      value={indicatorInputType}
                      onChange={(event) =>
                        setIndicatorInputType(event.target.value as IndicatorInputType)
                      }
                      disabled={saving}
                    >
                      <option value="text">Teks</option>
                      <option value="number">Angka</option>
                      <option value="date">Tanggal</option>
                    </Select>
                  </FormField>
                  <FormField
                    id="indicator-unit"
                    label="Satuan"
                    description="Opsional. Contoh: %, orang, dokumen."
                  >
                    <Input
                      id="indicator-unit"
                      value={indicatorUnit}
                      onChange={(event) => setIndicatorUnit(event.target.value)}
                      placeholder="Contoh: orang"
                      disabled={saving}
                    />
                  </FormField>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIndicatorDialog(false)}
                    disabled={saving}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={documentDialog} onOpenChange={setDocumentDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDocument ? "Ubah dokumen wajib" : "Tambah dokumen wajib"}
                </DialogTitle>
                <DialogDescription>
                  Dokumen dapat berlaku untuk seluruh periode atau satu indikator.
                </DialogDescription>
              </DialogHeader>
              <Form onSubmit={saveDocument} noValidate>
                {formError ? (
                  <p
                    className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : null}
                <FormField id="document-code" label="Kode" required>
                  <Input
                    id="document-code"
                    value={documentForm.code}
                    onChange={(event) =>
                      setDocumentForm((current) => ({ ...current, code: event.target.value }))
                    }
                    disabled={saving}
                  />
                </FormField>
                <FormField id="document-name" label="Nama dokumen" required>
                  <Input
                    id="document-name"
                    value={documentForm.name}
                    onChange={(event) =>
                      setDocumentForm((current) => ({ ...current, name: event.target.value }))
                    }
                    disabled={saving}
                  />
                </FormField>
                <FormField
                  id="document-indicator"
                  label="Indikator"
                  description="Kosongkan untuk dokumen tingkat periode."
                >
                  <Select
                    id="document-indicator"
                    value={documentForm.indicatorId ?? ""}
                    onChange={(event) =>
                      setDocumentForm((current) => ({
                        ...current,
                        indicatorId: event.target.value || undefined,
                        periodId: event.target.value ? undefined : (periodId ?? undefined),
                      }))
                    }
                    disabled={saving || Boolean(editingDocument)}
                  >
                    <option value="">Semua periode</option>
                    {indicators.map((indicator) => (
                      <option key={indicator.id} value={indicator.id}>
                        {indicator.code} — {indicator.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  id="document-types"
                  label="Tipe file yang diizinkan"
                  required
                  description="Pilih satu atau beberapa tipe file yang boleh diunggah."
                >
                  <DropdownMenu>
                    <div className="relative">
                      <DropdownMenuTrigger
                        id="document-types"
                        className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground shadow-xs transition-[border-color,box-shadow] focus-visible:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/25 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={saving}
                      >
                        <span
                          className={
                            documentMimeTypes.length ? "truncate" : "truncate text-muted-foreground"
                          }
                        >
                          {documentFileTypeSummary(documentMimeTypes)}
                        </span>
                        <ChevronDown
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)] p-2"
                      >
                        <div className="space-y-1" aria-label="Pilihan tipe file">
                          {documentFileTypeOptions.map((option, index) => {
                            const checked = documentMimeTypes.includes(option.value);
                            const checkboxId = `document-type-${index}`;
                            return (
                              <label
                                key={option.value}
                                htmlFor={checkboxId}
                                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
                              >
                                <Checkbox
                                  id={checkboxId}
                                  checked={checked}
                                  onChange={(event) =>
                                    toggleDocumentMimeType(option.value, event.target.checked)
                                  }
                                  disabled={saving}
                                />
                                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                  <span>{option.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {option.extension}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </DropdownMenuContent>
                    </div>
                  </DropdownMenu>
                </FormField>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField id="document-order" label="Urutan" required>
                    <Input
                      id="document-order"
                      type="number"
                      min="0"
                      value={documentForm.order}
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          order: Number(event.target.value),
                        }))
                      }
                      disabled={saving}
                    />
                  </FormField>
                  <FormField id="document-size" label="Ukuran maksimum (byte)" required>
                    <Input
                      id="document-size"
                      type="number"
                      min="1"
                      value={documentForm.maxSize}
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          maxSize: Number(event.target.value),
                        }))
                      }
                      disabled={saving}
                    />
                  </FormField>
                </div>
                <label
                  className="flex items-center gap-3 text-sm font-medium"
                  htmlFor="document-required"
                >
                  <Checkbox
                    id="document-required"
                    checked={documentForm.required}
                    onChange={(event) =>
                      setDocumentForm((current) => ({ ...current, required: event.target.checked }))
                    }
                    disabled={saving}
                  />
                  Dokumen wajib
                </label>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDocumentDialog(false)}
                    disabled={saving}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AppShell>
  );
}
