"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Edit3, Plus, Search } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiClientError, apiClient, type UPT, type UPTInput } from "@/lib/api-client";
import { errorMessage } from "@/lib/admin-helpers";
import { useRequireSession } from "@/lib/auth-provider";

const initialForm: UPTInput = { code: "", name: "", active: true };
const emptyPagination = { page: 1, pageSize: 10, total: 0, totalPages: 0 };

export default function UPTsPage() {
  const auth = useRequireSession();
  const allowed = auth.session?.user.role === "ADMIN_SIMPATIK";
  const [rows, setRows] = useState<UPT[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [filters, setFilters] = useState({ search: "", active: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UPT | null>(null);
  const [form, setForm] = useState<UPTInput>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const result = await apiClient.upts.list({ page, pageSize: 10, ...filters });
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
    if (!allowed) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [allowed, load]);

  function openForm(row?: UPT) {
    setEditing(row ?? null);
    setForm(row ? { code: row.code, name: row.name, active: row.active } : { ...initialForm });
    setFormError(null);
    setDialogOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Kode dan nama UPT wajib diisi.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await apiClient.upts.update(editing.id, { code: form.code.trim(), name: form.name.trim(), active: form.active });
      else await apiClient.upts.create({ code: form.code.trim(), name: form.name.trim(), active: form.active });
      setDialogOpen(false);
      await load();
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(row: UPT) {
    setActionId(row.id);
    try {
      if (row.active) await apiClient.upts.deactivate(row.id);
      else await apiClient.upts.activate(row.id);
      await load();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setActionId(null);
    }
  }

  const columns: DataTableColumn<UPT>[] = [
    { id: "code", header: "Kode", cell: (row) => <span className="font-semibold">{row.code}</span> },
    { id: "name", header: "Nama UPT", cell: (row) => row.name },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} /> },
    {
      id: "actions",
      header: "Aksi",
      className: "text-right",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => openForm(row)}>
            <Edit3 />Edit
          </Button>
          <ConfirmDialog
            trigger={<Button type="button" variant={row.active ? "destructive" : "outline"} size="sm">{row.active ? "Nonaktifkan" : "Aktifkan"}</Button>}
            title={`${row.active ? "Nonaktifkan" : "Aktifkan"} UPT?`}
            description={`${row.code} — ${row.name} akan ${row.active ? "dinonaktifkan" : "diaktifkan"}.`}
            confirmLabel={row.active ? "Nonaktifkan" : "Aktifkan"}
            destructive={row.active}
            loading={actionId === row.id}
            onConfirm={() => changeStatus(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      {!allowed ? (
        <section className="rounded-xl border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">Halaman master UPT hanya tersedia untuk Admin SIMPATIK.</p>
        </section>
      ) : denied ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center" role="alert">
          <h1 className="text-xl font-bold text-destructive">Akses ditolak</h1>
          <p className="mt-2 text-sm text-destructive">Anda tidak memiliki izin mengelola UPT.</p>
        </section>
      ) : (
        <div className="space-y-8">
          <PageHeader
            eyebrow="Master data"
            title="UPT"
            description="Kelola kode, nama, dan status operasional unit pelaksana teknis."
            actions={<Button type="button" onClick={() => openForm()}><Plus />Tambah UPT</Button>}
          />
          <FilterBar
            onSubmit={(event) => { event.preventDefault(); setPage(1); setFilters({ search: search.trim(), active }); }}
            onReset={() => { setSearch(""); setActive(""); setPage(1); setFilters({ search: "", active: "" }); }}
          >
            <FormField id="upt-search" label="Cari UPT">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="upt-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kode atau nama UPT" className="pl-9" />
              </div>
            </FormField>
            <FormField id="upt-active" label="Status">
              <Select id="upt-active" value={active} onChange={(event) => setActive(event.target.value)}>
                <option value="">Semua status</option>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </Select>
            </FormField>
          </FilterBar>
          <DataTable columns={columns} data={rows} getRowId={(row) => row.id} caption="Daftar UPT" loading={loading} loadingLabel="Memuat daftar UPT..." error={error ?? undefined} onRetry={() => void load()} pagination={pagination} onPageChange={setPage} emptyTitle="UPT belum tersedia" emptyDescription="Belum ada UPT yang sesuai dengan filter saat ini." />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Ubah UPT" : "Tambah UPT"}</DialogTitle>
                <DialogDescription>Isi metadata UPT tanpa menghapus histori laporan.</DialogDescription>
              </DialogHeader>
              <Form onSubmit={save} noValidate>
                {formError ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{formError}</p> : null}
                <FormField id="upt-code" label="Kode" required>
                  <Input id="upt-code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required disabled={saving} />
                </FormField>
                <FormField id="upt-name" label="Nama UPT" required>
                  <Input id="upt-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required disabled={saving} />
                </FormField>
                <label className="flex items-center gap-3 text-sm font-medium" htmlFor="upt-form-active">
                  <Checkbox id="upt-form-active" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} disabled={saving} />
                  UPT aktif
                </label>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
                </DialogFooter>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AppShell>
  );
}
