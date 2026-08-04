"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { ApiClientError, apiClient, type UPT, type User, type UserInput } from "@/lib/api-client";
import { errorMessage, roleLabels, roles } from "@/lib/admin-helpers";
import { useRequireSession, type AppRole } from "@/lib/auth-provider";

const uptRoles: AppRole[] = ["PETUGAS_UPT", "KOORDINATOR_UPT"];
const initialForm: UserInput = { name: "", email: "", password: "", role: "PETUGAS_UPT", uptId: null, active: true };
const emptyPagination = { page: 1, pageSize: 10, total: 0, totalPages: 0 };

export default function UsersPage() {
  const auth = useRequireSession();
  const allowed = auth.session?.user.role === "ADMIN_SIMPATIK";
  const [rows, setRows] = useState<User[]>([]);
  const [upts, setUpts] = useState<UPT[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [uptId, setUptId] = useState("");
  const [active, setActive] = useState("");
  const [filters, setFilters] = useState({ search: "", role: "", uptId: "", active: "" });
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserInput>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const uptById = useMemo(() => new Map(upts.map((upt) => [upt.id, upt])), [upts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const result = await apiClient.users.list({ page, pageSize: 10, ...filters });
      setRows(result.data);
      setPagination(result.pagination);
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.isForbidden) setDenied(true);
      else setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const loadUpts = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const result = await apiClient.upts.list({ page: 1, pageSize: 100 });
      setUpts(result.data);
    } catch (loadError) {
      setOptionsError(errorMessage(loadError));
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const timer = window.setTimeout(() => { void load(); void loadUpts(); }, 0);
    return () => window.clearTimeout(timer);
  }, [allowed, load, loadUpts]);

  function openForm(row?: User) {
    setEditing(row ?? null);
    setForm(row ? { name: row.name, email: row.email, password: "", role: row.role, uptId: row.uptId ?? null, active: row.active } : { ...initialForm });
    setFormError(null);
    setDialogOpen(true);
  }

  function changeRole(nextRole: AppRole) {
    setForm((current) => ({ ...current, role: nextRole, uptId: uptRoles.includes(nextRole) ? current.uptId : null }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Nama dan email wajib diisi.");
      return;
    }
    if (!editing && !form.password?.trim()) {
      setFormError("Password wajib diisi saat membuat pengguna.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setFormError("Password minimal 8 karakter.");
      return;
    }
    if (uptRoles.includes(form.role) && !form.uptId) {
      setFormError("Role Petugas UPT atau Koordinator UPT wajib memiliki penempatan UPT.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body: UserInput = { name: form.name.trim(), email: form.email.trim(), role: form.role, uptId: uptRoles.includes(form.role) ? form.uptId : null, active: form.active };
      if (form.password?.trim()) body.password = form.password;
      if (editing) await apiClient.users.update(editing.id, body);
      else await apiClient.users.create({ ...body, password: form.password });
      setDialogOpen(false);
      await load();
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(row: User) {
    setActionId(row.id);
    try {
      if (row.active) await apiClient.users.deactivate(row.id);
      else await apiClient.users.activate(row.id);
      await load();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setActionId(null);
    }
  }

  const columns: DataTableColumn<User>[] = [
    { id: "user", header: "Pengguna", cell: (row) => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted-foreground">{row.email}</p></div> },
    { id: "role", header: "Role", cell: (row) => roleLabels[row.role] },
    { id: "upt", header: "UPT", cell: (row) => row.upt?.name ?? (row.uptId ? uptById.get(row.uptId)?.name ?? "UPT tidak ditemukan" : "—") },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} /> },
    {
      id: "actions",
      header: "Aksi",
      className: "text-right",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => openForm(row)}><Edit3 />Edit</Button>
          <ConfirmDialog
            trigger={<Button type="button" variant={row.active ? "destructive" : "outline"} size="sm">{row.active ? "Nonaktifkan" : "Aktifkan"}</Button>}
            title={`${row.active ? "Nonaktifkan" : "Aktifkan"} pengguna?`}
            description={`${row.name} akan ${row.active ? "dinonaktifkan" : "diaktifkan"}.`}
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
        <section className="rounded-xl border bg-card p-8 text-center"><h1 className="text-xl font-bold">Akses ditolak</h1><p className="mt-2 text-sm text-muted-foreground">Manajemen pengguna hanya tersedia untuk Admin SIMPATIK.</p></section>
      ) : denied ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center" role="alert"><h1 className="text-xl font-bold text-destructive">Akses ditolak</h1><p className="mt-2 text-sm text-destructive">Anda tidak memiliki izin mengelola pengguna.</p></section>
      ) : (
        <div className="space-y-8">
          <PageHeader eyebrow="Administrasi" title="Pengguna" description="Kelola akun, role, penempatan UPT, dan status akses pengguna." actions={<Button type="button" onClick={() => openForm()}><Plus />Tambah pengguna</Button>} />
          <FilterBar
            onSubmit={(event) => { event.preventDefault(); setPage(1); setFilters({ search: search.trim(), role, uptId, active }); }}
            onReset={() => { setSearch(""); setRole(""); setUptId(""); setActive(""); setPage(1); setFilters({ search: "", role: "", uptId: "", active: "" }); }}
          >
            <FormField id="user-search" label="Cari pengguna"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="user-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama atau email" className="pl-9" /></div></FormField>
            <FormField id="user-role-filter" label="Role"><Select id="user-role-filter" value={role} onChange={(event) => setRole(event.target.value)}><option value="">Semua role</option>{roles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</Select></FormField>
            <FormField id="user-upt-filter" label="UPT"><Select id="user-upt-filter" value={uptId} onChange={(event) => setUptId(event.target.value)}><option value="">Semua UPT</option>{upts.map((upt) => <option key={upt.id} value={upt.id}>{upt.code} — {upt.name}</option>)}</Select></FormField>
            <FormField id="user-active-filter" label="Status"><Select id="user-active-filter" value={active} onChange={(event) => setActive(event.target.value)}><option value="">Semua status</option><option value="true">Aktif</option><option value="false">Nonaktif</option></Select></FormField>
          </FilterBar>
          {optionsError ? <p className="text-sm text-destructive" role="alert">Opsi UPT: {optionsError}</p> : null}
          <DataTable columns={columns} data={rows} getRowId={(row) => row.id} caption="Daftar pengguna" loading={loading} loadingLabel="Memuat daftar pengguna..." error={error ?? undefined} onRetry={() => void load()} pagination={pagination} onPageChange={setPage} emptyTitle="Pengguna belum tersedia" emptyDescription="Belum ada pengguna yang sesuai dengan filter saat ini." />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Ubah pengguna" : "Tambah pengguna"}</DialogTitle><DialogDescription>Password tidak pernah ditampilkan. Isi password hanya saat membuat atau mereset password.</DialogDescription></DialogHeader>
              <Form onSubmit={save} noValidate>
                {formError ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{formError}</p> : null}
                <FormField id="user-name" label="Nama" required><Input id="user-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required disabled={saving} /></FormField>
                <FormField id="user-email" label="Email" required><Input id="user-email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required disabled={saving} /></FormField>
                <FormField id="user-password" label={editing ? "Reset password" : "Password"} description={editing ? "Kosongkan jika password tidak diubah." : "Minimal 8 karakter."} required={!editing}><Input id="user-password" type="password" autoComplete="new-password" value={form.password ?? ""} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required={!editing} disabled={saving} /></FormField>
                <FormField id="user-role" label="Role" required><Select id="user-role" value={form.role} onChange={(event) => changeRole(event.target.value as AppRole)} disabled={saving}>{roles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</Select></FormField>
                <FormField id="user-upt" label="Penempatan UPT" required={uptRoles.includes(form.role)} description={uptRoles.includes(form.role) ? "Wajib untuk role UPT." : "Role non-UPT tidak memiliki penempatan UPT."}><Select id="user-upt" value={form.uptId ?? ""} onChange={(event) => setForm((current) => ({ ...current, uptId: event.target.value || null }))} disabled={saving || !uptRoles.includes(form.role) || optionsLoading}><option value="">Pilih UPT</option>{upts.map((upt) => <option key={upt.id} value={upt.id} disabled={!upt.active}>{upt.code} — {upt.name}{!upt.active ? " (nonaktif)" : ""}</option>)}</Select></FormField>
                <label className="flex items-center gap-3 text-sm font-medium" htmlFor="user-form-active"><Checkbox id="user-form-active" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} disabled={saving} />Akun aktif</label>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button><Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AppShell>
  );
}
