"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LoadingState } from "@/components/shared/loading-state";
import { useRequireSession, type AppRole } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";

interface NavigationItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
}

const navigation: NavigationItem[] = [
  {
    label: "Dasbor",
    href: "/",
    icon: LayoutDashboard,
    roles: [
      "PIMPINAN",
      "PRODUCT_OWNER",
      "PETUGAS_KANWIL",
      "KOORDINATOR_UPT",
      "PETUGAS_UPT",
      "ADMIN_SIMPATIK",
    ],
  },
  {
    label: "Katalog komponen",
    href: "/components",
    icon: PanelLeftClose,
    roles: [
      "PIMPINAN",
      "PRODUCT_OWNER",
      "PETUGAS_KANWIL",
      "KOORDINATOR_UPT",
      "PETUGAS_UPT",
      "ADMIN_SIMPATIK",
      "SYSTEM_ADMIN",
    ],
  },
  {
    label: "Laporan",
    href: "/reports",
    icon: ShieldCheck,
    roles: ["PIMPINAN", "PRODUCT_OWNER", "PETUGAS_KANWIL", "KOORDINATOR_UPT", "PETUGAS_UPT"],
  },
  { label: "Pengguna", href: "/users", icon: Users, roles: ["ADMIN_SIMPATIK"] },
  {
    label: "Pengaturan",
    href: "/settings",
    icon: Settings2,
    roles: ["ADMIN_SIMPATIK", "SYSTEM_ADMIN"],
  },
];

const roleLabels: Record<AppRole, string> = {
  PIMPINAN: "Pimpinan",
  PRODUCT_OWNER: "Product Owner",
  PETUGAS_KANWIL: "Petugas Kanwil",
  KOORDINATOR_UPT: "Koordinator UPT",
  PETUGAS_UPT: "Petugas UPT",
  ADMIN_SIMPATIK: "Admin SIMPATIK",
  SYSTEM_ADMIN: "System Administrator",
};

function NavigationLinks({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const visibleNavigation = navigation.filter((item) => item.roles.includes(role));

  return (
    <nav aria-label="Navigasi utama" className="space-y-1">
      {visibleNavigation.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
        S
      </span>
      <span>
        <span className="block text-sm font-bold tracking-wide">SIMPATIK</span>
        <span className="block text-[10px] text-sidebar-foreground/60">Monitoring Kepatuhan</span>
      </span>
    </Link>
  );
}

function UserMenu() {
  const { session, logout } = useRequireSession();
  const user = session?.user;
  const initials =
    user?.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "--";

  return (
    <DropdownMenu>
      <div className="relative">
        <DropdownMenuTrigger className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </span>
          <span className="hidden min-w-0 md:block">
            <span className="block truncate text-sm font-semibold">{user?.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {user ? roleLabels[user.role] : ""}
            </span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Akun pengguna</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profil saya</DropdownMenuItem>
          <DropdownMenuItem>Preferensi</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => void logout()}>
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const auth = useRequireSession();

  if (auth.isPending) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <LoadingState label="Memuat sesi pengguna..." />
      </main>
    );
  }

  if (auth.error) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <LoadingState
          label="Sesi pengguna belum dapat dimuat."
          error
          onRetry={() => void auth.refetch()}
        />
      </main>
    );
  }

  if (!auth.session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <LoadingState label="Mengarahkan ke halaman login..." />
      </main>
    );
  }

  const role = auth.session.user.role;

  if (role === "SYSTEM_ADMIN" && pathname === "/") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <section className="w-full rounded-xl border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-primary">Akses teknis</p>
          <h1 className="mt-2 text-2xl font-bold">Ruang kerja teknis</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Akun System Administrator hanya memiliki akses deployment, health check, backup, dan log
            teknis.
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Buka pengaturan teknis
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-sidebar-border px-5">
          <Brand />
        </div>
        <div className="flex-1 space-y-8 px-4 py-6">
          <div>
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/50">
              Menu utama
            </p>
            <NavigationLinks role={role} />
          </div>
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
            <p className="text-xs font-semibold">Periode aktif</p>
            <p className="mt-1 text-sm text-sidebar-foreground/70">Pelaporan Semester I 2026</p>
            <p className="mt-3 text-xs text-sidebar-foreground/60">Tenggat 30 Juni 2026</p>
          </div>
        </div>
        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-sidebar-foreground/50">SIMPATIK v0.1.0</p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                className="inline-flex size-10 items-center justify-center rounded-lg border lg:hidden"
                aria-label="Buka navigasi"
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-80 max-w-[85vw] bg-sidebar text-sidebar-foreground"
              >
                <SheetHeader>
                  <Brand />
                  <SheetTitle className="sr-only">Navigasi SIMPATIK</SheetTitle>
                  <SheetDescription className="sr-only">
                    Menu utama aplikasi SIMPATIK
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-8">
                  <NavigationLinks role={role} onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground">Selamat datang kembali</p>
              <p className="text-sm font-semibold">Ruang kerja SIMPATIK</p>
            </div>
            <div className="sm:hidden">
              <p className="text-sm font-bold">SIMPATIK</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" aria-label="Notifikasi">
              <Bell className="size-5" />
            </Button>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
