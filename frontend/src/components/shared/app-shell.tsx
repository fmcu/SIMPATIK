"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { LoadingState } from "@/components/shared/loading-state";
import { SimpatikLogo } from "@/components/shared/simpatik-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
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
import { useRequireSession, type AppRole } from "@/lib/auth-provider";
import { navigationItems } from "@/lib/role-navigation";
import { cn } from "@/lib/utils";

const navigationIcons = {
  dashboard: LayoutDashboard,
  reports: FileText,
  validation: ClipboardCheck,
  review: ShieldCheck,
  approval: BadgeCheck,
  users: Users,
  upts: Building2,
  periods: CalendarDays,
  settings: Settings2,
};

const roleLabels: Record<AppRole, string> = {
  PIMPINAN: "Pimpinan",
  PRODUCT_OWNER: "Product Owner",
  PETUGAS_KANWIL: "Petugas Kanwil",
  KOORDINATOR_UPT: "Koordinator UPT",
  PETUGAS_UPT: "Petugas UPT",
  ADMIN_SIMPATIK: "Admin SIMPATIK",
  SYSTEM_ADMIN: "System Administrator",
};

function navigationForRole(role: AppRole) {
  return navigationItems.filter((item) => item.roles.includes(role));
}

function activeNavigationHref(role: AppRole, pathname: string) {
  const visibleNavigation = navigationForRole(role);
  const exactMatch = visibleNavigation.find((item) => item.href === pathname);

  if (exactMatch) return exactMatch.href;

  return visibleNavigation
    .filter((item) => item.href !== "/" && pathname.startsWith(`${item.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
}

function NavigationLinks({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const visibleNavigation = navigationForRole(role);
  const activeHref = activeNavigationHref(role, pathname);

  return (
    <nav aria-label="Navigasi utama" className="space-y-1">
      {visibleNavigation.map((item) => {
        const Icon = navigationIcons[item.icon];
        const active = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-sidebar-accent text-white shadow-sm"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-white",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
            {active ? (
              <span
                className="ml-auto size-1.5 rounded-full bg-gold ring-4 ring-gold/10"
                aria-hidden="true"
              />
            ) : null}
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
      className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <SimpatikLogo inverse />
    </Link>
  );
}

function HelpCard() {
  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
      <div className="flex items-center gap-2 text-white">
        <HelpCircle className="size-4 text-gold" aria-hidden="true" />
        <p className="text-sm font-semibold">Butuh bantuan?</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-sidebar-foreground/65">
        Hubungi Admin SIMPATIK untuk akses, periode, atau kendala pelaporan.
      </p>
    </div>
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
        <DropdownMenuTrigger className="flex min-h-10 items-center gap-2 rounded-full px-1.5 pr-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-2 ring-gold/20">
            {initials}
          </span>
          <span className="hidden min-w-0 md:block">
            <span className="block max-w-44 truncate text-sm font-semibold">{user?.name}</span>
            <span className="block max-w-44 truncate text-xs text-muted-foreground">
              {user ? roleLabels[user.role] : ""}
            </span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>
            <span className="block text-sm font-semibold text-foreground">{user?.name}</span>
            <span className="mt-0.5 block truncate font-normal">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => void logout()}>
            <LogOut aria-hidden="true" />
            Keluar dari akun
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
      <main className="dashboard-surface mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <LoadingState label="Memuat sesi pengguna..." />
      </main>
    );
  }

  if (auth.error) {
    return (
      <main className="dashboard-surface mx-auto flex min-h-screen w-full max-w-md items-center px-6">
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
      <main className="dashboard-surface mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <LoadingState label="Mengarahkan ke halaman login..." />
      </main>
    );
  }

  const role = auth.session.user.role;
  const activeHref = activeNavigationHref(role, pathname);
  const currentNavigation = navigationForRole(role).find((item) => item.href === activeHref);

  if (role === "SYSTEM_ADMIN" && pathname === "/") {
    return (
      <main className="dashboard-surface flex min-h-screen items-center justify-center bg-background px-6">
        <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <SimpatikLogo className="mb-7 justify-center" />
          <p className="text-sm font-semibold text-primary">Akses teknis</p>
          <h1 className="mt-2 text-2xl font-extrabold">Ruang kerja teknis</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Akun System Administrator hanya memiliki akses deployment, health check, backup, dan log
            teknis.
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-px hover:bg-primary/90 hover:shadow-md"
          >
            Buka pengaturan teknis
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground shadow-xl lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Brand />
        </div>
        <div className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
          <div>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              Menu utama
            </p>
            <NavigationLinks role={role} />
          </div>
          <HelpCard />
        </div>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-xs text-sidebar-foreground/45">SIMPATIK v0.1.0</p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                className="inline-flex size-10 items-center justify-center rounded-lg border bg-background shadow-xs transition-colors hover:bg-accent lg:hidden"
                aria-label="Buka navigasi"
              >
                <Menu className="size-5" aria-hidden="true" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-80 max-w-[85vw] border-sidebar-border bg-sidebar text-sidebar-foreground"
              >
                <SheetHeader>
                  <Brand />
                  <SheetTitle className="sr-only">Navigasi SIMPATIK</SheetTitle>
                  <SheetDescription className="sr-only">
                    Menu utama aplikasi SIMPATIK
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-8 space-y-7">
                  <NavigationLinks role={role} onNavigate={() => setMobileOpen(false)} />
                  <HelpCard />
                </div>
              </SheetContent>
            </Sheet>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">{currentNavigation?.label ?? "SIMPATIK"}</p>
              <p className="text-xs text-muted-foreground">Sistem pelaporan kepatuhan</p>
            </div>
            <div className="sm:hidden">
              <SimpatikLogo compact />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <div className="relative">
                <DropdownMenuTrigger
                  className="relative inline-flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label="Notifikasi"
                >
                  <Bell className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72">
                  <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    Belum ada notifikasi baru.
                  </p>
                </DropdownMenuContent>
              </div>
            </DropdownMenu>
            <UserMenu />
          </div>
        </header>

        <main className="dashboard-surface flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
