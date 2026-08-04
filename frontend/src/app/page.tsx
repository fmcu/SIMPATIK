import { AppShell } from "@/components/shared/app-shell";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, type ReportStatus } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, CheckCircle2, Clock3, FileCheck2, FileText, Plus } from "lucide-react";

interface ReportSummary {
  id: string;
  unit: string;
  period: string;
  status: ReportStatus;
  updatedAt: string;
}

const reports: ReportSummary[] = [
  { id: "RPT-2026-001", unit: "Kantor Imigrasi Kelas I TPI Surabaya", period: "Semester I 2026", status: "APPROVED", updatedAt: "24 Jun 2026" },
  { id: "RPT-2026-002", unit: "Kantor Imigrasi Kelas I TPI Malang", period: "Semester I 2026", status: "REVIEWED", updatedAt: "25 Jun 2026" },
  { id: "RPT-2026-003", unit: "Kantor Imigrasi Kelas II Non TPI Kediri", period: "Semester I 2026", status: "SUBMITTED", updatedAt: "26 Jun 2026" },
  { id: "RPT-2026-004", unit: "Kantor Imigrasi Kelas II TPI Jember", period: "Semester I 2026", status: "REVISION_REQUIRED", updatedAt: "26 Jun 2026" },
];

const columns: DataTableColumn<ReportSummary>[] = [
  { id: "report", header: "Laporan", cell: (row) => <div><p className="font-semibold">{row.id}</p><p className="mt-1 text-xs text-muted-foreground">{row.period}</p></div> },
  { id: "unit", header: "UPT", cell: (row) => row.unit },
  { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  { id: "updated", header: "Diperbarui", cell: (row) => <span className="text-muted-foreground">{row.updatedAt}</span> },
];

export default function HomePage() {
  return <AppShell><div className="space-y-8"><PageHeader eyebrow="Ringkasan pelaporan" title="Dasbor kepatuhan" description="Pantau progres pelaporan 12 UPT pada periode aktif." actions={<><Button variant="outline"><ArrowDownToLine className="size-4" />Unduh rekap</Button><Button><Plus className="size-4" />Buat laporan</Button></>} /><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><DashboardCard title="Total laporan" value="12" description="dari 12 UPT" icon={<FileText className="size-5" />} /><DashboardCard title="Disetujui" value="7" trend="58,3% dari total" trendDirection="up" icon={<CheckCircle2 className="size-5" />} /><DashboardCard title="Menunggu reviu" value="3" description="perlu ditindaklanjuti" icon={<Clock3 className="size-5" />} /><DashboardCard title="Perlu revisi" value="2" trend="16,7% dari total" trendDirection="down" icon={<FileCheck2 className="size-5" />} /></section><section className="grid gap-6 xl:grid-cols-[1fr_20rem]"><div className="min-w-0 space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Laporan terbaru</h2><p className="text-sm text-muted-foreground">Aktivitas laporan pada periode aktif</p></div><Button variant="ghost" size="sm">Lihat semua</Button></div><DataTable columns={columns} data={reports} getRowId={(row) => row.id} caption="Daftar laporan terbaru" /></div><aside className="rounded-xl border bg-primary p-5 text-primary-foreground"><p className="text-sm font-semibold">Status periode</p><p className="mt-4 text-3xl font-bold">83%</p><p className="mt-1 text-sm text-primary-foreground/75">12 dari 12 UPT mengirim laporan</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-primary-foreground/20"><div className="h-full w-[83%] rounded-full bg-primary-foreground" /></div><div className="mt-5 flex items-center justify-between text-xs text-primary-foreground/75"><span>Tenggat</span><span>30 Jun 2026</span></div><Badge className="mt-5 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground" variant="outline">3 hari tersisa</Badge></aside></section></div></AppShell>;
}
