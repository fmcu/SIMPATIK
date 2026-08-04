"use client";

import { useState } from "react";
import { AlertCircle, FileText, LockKeyhole, Search, Users } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState, EmptyStateAction } from "@/components/shared/empty-state";
import { FileUpload } from "@/components/shared/file-upload";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormField } from "@/components/shared/form-field";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge, type ReportStatus } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormDescription, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, ToastViewport, useToast } from "@/components/ui/toast";

interface CatalogReport {
  id: string;
  unit: string;
  status: ReportStatus;
}

const catalogReports: CatalogReport[] = [
  { id: "RPT-001", unit: "Kantor Imigrasi Surabaya", status: "APPROVED" },
  { id: "RPT-002", unit: "Kantor Imigrasi Malang", status: "REVISION_REQUIRED" },
];

const catalogColumns: DataTableColumn<CatalogReport>[] = [
  { id: "id", header: "ID laporan", cell: (row) => <span className="font-semibold">{row.id}</span> },
  { id: "unit", header: "UPT", cell: (row) => row.unit },
  { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
];

function ToastDemo() {
  const { toast } = useToast();
  return <Button type="button" onClick={() => toast({ title: "Berhasil disimpan", description: "Perubahan komponen tersimpan.", variant: "success" })}>Tampilkan toast</Button>;
}

function CatalogPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [filterValue, setFilterValue] = useState("");

  return (
    <AppShell>
      <div className="space-y-10">
        <PageHeader
          eyebrow="Development only"
          title="Katalog komponen"
          description="Referensi visual reusable component SIMPATIK beserta state dan perilaku dasar aksesibilitas."
          breadcrumbs={[{ label: "Dasbor", href: "/" }, { label: "Katalog komponen" }]}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="catalog-section">
            <div className="catalog-heading">
              <div><h2>Button, badge, dan status</h2><p>Action, status workflow PRD, dan state disabled.</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Utama</Button>
              <Button variant="secondary">Sekunder</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destruktif</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="DRAFT" />
              <StatusBadge status="SUBMITTED" />
              <StatusBadge status="REVISION_REQUIRED" />
              <StatusBadge status="REVIEWED" />
              <StatusBadge status="APPROVED" />
              <Badge variant="outline">Label umum</Badge>
            </div>
          </section>

          <section className="catalog-section">
            <div className="catalog-heading">
              <div><h2>Form dan input</h2><p>Label, deskripsi, error, focus, dan keyboard navigation.</p></div>
            </div>
            <Form>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="catalog-search" label="Cari laporan" description="Masukkan ID atau nama UPT.">
                  <Input id="catalog-search" placeholder="Contoh: RPT-001" value={filterValue} onChange={(event) => setFilterValue(event.target.value)} />
                </FormField>
                <FormField id="catalog-period" label="Periode" required>
                  <Select id="catalog-period" defaultValue="semester-1"><option value="semester-1">Semester I 2026</option><option value="semester-2">Semester II 2026</option></Select>
                </FormField>
              </div>
              <FormField id="catalog-note" label="Catatan reviu" error="Catatan wajib diisi.">
                <Textarea id="catalog-note" aria-invalid="true" placeholder="Tulis catatan untuk UPT" />
              </FormField>
              <div className="flex items-center gap-2">
                <Checkbox id="catalog-checkbox" defaultChecked />
                <FormLabel htmlFor="catalog-checkbox">Saya sudah memeriksa kelengkapan data</FormLabel>
              </div>
              <FormDescription>Field ini menggunakan label eksplisit dan pesan error yang dapat dibaca screen reader.</FormDescription>
              <FormMessage>Contoh pesan validasi</FormMessage>
            </Form>
          </section>

          <section className="catalog-section xl:col-span-2">
            <div className="catalog-heading">
              <div><h2>Data table dan filter</h2><p>State normal, empty, loading, error, dan filter tanpa query bisnis.</p></div>
            </div>
            <FilterBar onSubmit={(event) => event.preventDefault()} onReset={() => setFilterValue("")}>
              <FormField id="table-filter" label="Cari">
                <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" /><Input id="table-filter" className="pl-9" placeholder="Cari data" value={filterValue} onChange={(event) => setFilterValue(event.target.value)} /></div>
              </FormField>
              <FormField id="table-status" label="Status">
                <Select id="table-status" defaultValue="all"><option value="all">Semua status</option><option value="approved">Disetujui</option></Select>
              </FormField>
            </FilterBar>
            <DataTable columns={catalogColumns} data={catalogReports} getRowId={(row) => row.id} />
            <div className="grid gap-4 md:grid-cols-3">
              <LoadingState label="Memuat daftar laporan" />
              <EmptyState title="Belum ada laporan" description="Laporan pada filter ini belum tersedia." action={<EmptyStateAction variant="outline">Bersihkan filter</EmptyStateAction>} />
              <LoadingState error label="Data gagal dimuat." onRetry={() => undefined} />
            </div>
          </section>

          <section className="catalog-section xl:col-span-2">
            <div className="catalog-heading">
              <div><h2>File upload dan dialog</h2><p>Unggah bukti, konfirmasi aksi, dropdown menu, dan sheet mobile.</p></div>
            </div>
            <FileUpload id="catalog-upload" accept=".pdf,.docx,.xlsx,image/*" files={files} onFilesChange={setFiles} onError={(message) => window.alert(message)} />
            <div className="flex flex-wrap gap-3">
              <ConfirmDialog trigger={<Button variant="destructive">Hapus laporan</Button>} title="Hapus laporan?" description="Aksi ini hanya contoh katalog dan tidak memanggil API." confirmLabel="Ya, hapus" onConfirm={() => undefined} destructive />
              <Dialog><DialogTrigger className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-semibold hover:bg-accent">Buka dialog</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Detail komponen</DialogTitle><DialogDescription>Dialog menjaga fokus dan dapat ditutup dengan Escape.</DialogDescription></DialogHeader><p className="mt-4 text-sm">Konten dialog contoh.</p></DialogContent></Dialog>
              <DropdownMenu><div className="relative"><DropdownMenuTrigger className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-semibold hover:bg-accent">Menu pengguna</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuLabel>Aksi cepat</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem>Profil saya</DropdownMenuItem><DropdownMenuItem>Preferensi</DropdownMenuItem></DropdownMenuContent></div></DropdownMenu>
              <Sheet><SheetTrigger className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-semibold hover:bg-accent">Buka sheet</SheetTrigger><SheetContent><SheetHeader><SheetTitle>Panel detail</SheetTitle><SheetDescription>Panel untuk navigasi mobile dan detail ringkas.</SheetDescription></SheetHeader><div className="mt-6"><Button>Action sheet</Button></div></SheetContent></Sheet>
            </div>
          </section>

          <section className="catalog-section xl:col-span-2">
            <div className="catalog-heading">
              <div><h2>Card, skeleton, separator, toast</h2><p>Ringkasan dashboard, loading, notifikasi, dan permission state.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DashboardCard title="Laporan disetujui" value="7" description="dari 12 UPT" icon={<FileText className="size-5" />} />
              <DashboardCard title="Memuat metrik" value="-" loading icon={<Users className="size-5" />} />
            </div>
            <Separator className="my-5" />
            <div className="flex flex-wrap items-center gap-3">
              <ToastDemo />
              <PermissionGate allowed={false} fallback={<div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground"><LockKeyhole className="size-4" aria-hidden="true" />Akses ditolak</div>}><Button>Aksi berizin</Button></PermissionGate>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertCircle className="size-4" />PermissionGate menerima status dari session/API.</div>
            </div>
            <div className="mt-5 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-full" /></div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

export default function ComponentsPage() {
  return <ToastProvider><CatalogPage /><ToastViewport /></ToastProvider>;
}
