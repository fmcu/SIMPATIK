"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Database, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api-client";
import { healthStateFromResponse, type HealthState } from "@/lib/settings";

type HealthEndpoint = "live" | "ready";

const initialHealth: HealthState = {
  status: "unavailable",
  label: "Belum diperiksa",
  description: "Status belum dimuat.",
};

async function checkHealth(endpoint: HealthEndpoint): Promise<HealthState> {
  try {
    const response = await fetch(`${API_URL.replace(/\/$/, "")}/health/${endpoint}`, {
      cache: "no-store",
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {}
    return healthStateFromResponse(endpoint, response.status, payload);
  } catch {
    return {
      status: "unavailable",
      label: endpoint === "live" ? "Tidak aktif" : "Tidak siap",
      description: "Server belum dapat dihubungi.",
    };
  }
}

export function HealthPanel() {
  const [live, setLive] = useState(initialHealth);
  const [ready, setReady] = useState(initialHealth);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [nextLive, nextReady] = await Promise.all([checkHealth("live"), checkHealth("ready")]);
    setLive(nextLive);
    setReady(nextReady);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const cards = [
    { title: "Proses aplikasi", state: live, icon: Activity },
    { title: "Kesiapan layanan", state: ready, icon: Database },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Teknis" title="Kesehatan sistem" description="Pantau proses aplikasi dan kesiapan database tanpa membuka substansi laporan." actions={<Button type="button" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />{loading ? "Memeriksa..." : "Muat ulang"}</Button>} />
      <section className="grid gap-4 md:grid-cols-2" aria-label="Status kesehatan sistem" aria-busy={loading}>
        {cards.map(({ title, state, icon: Icon }) => (
          <article key={title} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">{title}</p><p className="mt-2 text-xl font-bold">{state.label}</p></div><div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></div></div>
            <div className="mt-4 space-y-2"><Badge variant={state.status === "available" ? "active" : "warning"}>{state.status === "available" ? "Tersedia" : "Bermasalah"}</Badge><p className="text-sm text-muted-foreground" role={state.status === "unavailable" ? "alert" : undefined}>{state.description}</p></div>
          </article>
        ))}
      </section>
    </div>
  );
}
