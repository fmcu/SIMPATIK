import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  loading?: boolean;
  className?: string;
}

export function DashboardCard({ title, value, description, icon, trend, trendDirection = "neutral", loading = false, className }: DashboardCardProps) {
  return <article className={cn("rounded-xl border bg-card p-5 shadow-sm", className)} aria-busy={loading}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">{title}</p>{loading ? <div className="mt-2 h-9 w-24 animate-pulse rounded bg-muted" /> : <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>}</div>{icon ? <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div> : null}</div>{description || trend ? <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">{trend ? <span className={cn("inline-flex items-center gap-1 font-medium", trendDirection === "up" && "text-success", trendDirection === "down" && "text-destructive", trendDirection === "neutral" && "text-muted-foreground")}>{trendDirection !== "neutral" ? <ArrowUpRight className={cn("size-4", trendDirection === "down" && "rotate-90")} aria-hidden="true" /> : null}{trend}</span> : null}{description ? <span className="text-muted-foreground">{description}</span> : null}</div> : null}</article>;
}
