"use client";

import { AppShell } from "@/components/shared/app-shell";
import { useRequireSession } from "@/lib/auth-provider";
import { settingsPanelForRole } from "@/lib/settings";
import { AuditLogPanel } from "./audit-log-panel";
import { HealthPanel } from "./health-panel";

export default function SettingsPage() {
  const auth = useRequireSession();
  const panel = settingsPanelForRole(auth.session?.user.role);

  return (
    <AppShell>
      {panel === "audit" ? (
        <AuditLogPanel />
      ) : panel === "health" ? (
        <HealthPanel />
      ) : (
        <section className="rounded-xl border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pengaturan hanya tersedia untuk Admin SIMPATIK dan System Administrator.
          </p>
        </section>
      )}
    </AppShell>
  );
}
