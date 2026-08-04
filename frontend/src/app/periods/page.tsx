"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Edit3, Eye, Plus, Search } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiClientError, apiClient, type Period, type PeriodInput } from "@/lib/api-client";
import { dateLabel, errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

const initialForm: PeriodInput = { name: "", startDate: "", dueDate: "", status: "DRAFT" };
const emptyPagination = { page: 1, pageSize: 10, total: 0, totalPages: 0 };

export default function PeriodsPage() {
  const auth = useRequireSession();
  const role = auth.session?.user.role;
  const canView = role === "ADMIN_SIMPATIK" || role === "PRODUCT_OWNER";
  const canManage = role === "ADMIN_SIMPATIK";
  const [rows, setRows] = useState<Period[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Period | null>(null);
  const [form, setForm] = useState<PeriodInput>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const result = await apiClient.periods.list({ page, pageSize: 10, ...filters });
      setRows(result.data);
      setPagination(result.pagination);
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.isForbidden) setDenied(true);
      else setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (!canView) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canView, load]);

  function openForm(row?: Period) {
    setEditing(row ?? null);
    setForm(row ? { name: row.name, startDate: row.startDate.slice(0, 10), dueDate: row.dueDate.slice(0, 10), status: row.status } : { ...initialForm });
    setFormError(null);
    setDialogOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.dueDate) {
      setFormError("Nama, tanggal mulai, dan tenggat wajib diisi.");
      return;
    }
    if (form.startDate > form.dueDate) {
      setFormError("Tenggat harus setelah atau sama dengan tanggal mulai.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = { ...form, name: form.name.trim() };
      if (editing) await apiClient.periods.update(editing.id, body);
      else await apiClient.periods.create(body);
      setDialogOpen(false);
      await load();
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<Period>[] = [
    { id: "period", header: "Periode", cell: (row) => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted-foreground">{dateLabel(row.startDate)} — {dateLabel(row.dueDate)}</p></div> },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { id: "indicators", header: "Konfigurasi", cell: (row) => <span className="text-muted-foreground">{row.indicators?.length ?? "—"} indikator</span> },
    {
      id: "actions",
      header: "Aksi",
      className: "text-right",
      cell: (row) => <div className="flex justify-end gap-2"><Link href={`/periods/${row.id}`} className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Eye />Detail</Link>{canManage ? <Button type="button" variant="outline" size="sm" onClick={() => openForm(row)}><Edit3 />Edit</Button> : null}</div>,
    },
  ];

  return (
    <AppShell>
      {!canView ? (
        <section className="rounded-xl border bg-card p-8 text-center"><h1 className="text-xl font-bold">Akses ditolak</h1><p className="mt-2 text-sm text-muted-foreground">Halaman periode hanya tersedia untuk Admin SIMPATIK dan Product Owner.</p></section>
      ) : denied ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center" role="alert"><h1 className="text-xl font-bold text-destructive">Akses ditolak</h1><p className="mt-2 text-sm text-destructive">Anda tidak memiliki izin mengelola periode.</p></section>
      ) : (
        <div className="space-y-8">
          <PageHeader eyebrow="Master data" title="Periode pelaporan" description="Kelola rentang waktu, tenggat, status, indikator, dan dokumen wajib." actions={canManage ? <Button type="button" onClick={() => openForm()}><Plus />Tambah periode</Button> : undefined} />
          <FilterBar onSubmit={(event) => { event.preventDefault(); setPage(1); setFilters({ search: search.trim(), status }); }} onReset={() => { setSearch(""); setStatus(""); setPage(1); setFilters({ search: "", status: "" }); }}>
            <FormField id="period-search" label="Cari periode"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="period-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama periode" className="pl-9" /></div></FormField>
            <FormField id="period-status" label="Status"><Select id="period-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua status</option><option value="DRAFT">Draf</option><option value="ACTIVE">Aktif</option><option value="CLOSED">Ditutup</option></Select></FormField>
          </FilterBar>
          <DataTable columns={columns} data={rows} getRowId={(row) => row.id} caption="Daftar periode pelaporan" loading={loading} loadingLabel="Memuat daftar periode..." error={error ?? undefined} onRetry={() => void load()} pagination={pagination} onPageChange={setPage} emptyTitle="Periode belum tersedia" emptyDescription="Belum ada periode yang sesuai dengan filter saat ini." />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Ubah periode" : "Tambah periode"}</DialogTitle><DialogDescription>Transisi status periode divalidasi oleh server.</DialogDescription></DialogHeader>
              <Form onSubmit={save} noValidate>
                {formError ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{formError}</p> : null}
                <FormField id="period-name" label="Nama periode" required><Input id="period-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required disabled={saving} /></FormField>
                <div className="grid gap-5 sm:grid-cols-2"><FormField id="period-start" label="Tanggal mulai" required><Input id="period-start" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} required disabled={saving} /></FormField><FormField id="period-due" label="Tenggat" required><Input id="period-due" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} required disabled={saving} /></FormField></div>
                <FormField id="period-form-status" label="Status" required><Select id="period-form-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PeriodInput["status"] }))} disabled={saving}><option value="DRAFT">Draf</option><option value="ACTIVE">Aktif</option><option value="CLOSED">Ditutup</option></Select></FormField>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button><Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AppShell>
  );
}
