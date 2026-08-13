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

export function DashboardCard({
  title,
  value,
  description,
  icon,
  trend,
  trendDirection = "neutral",
  loading = false,
  className,
}: DashboardCardProps) {
  return (
    <article
      className={cn(
        "group relative h-full overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md",
        className,
      )}
      aria-busy={loading}
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/70 to-gold opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-2 h-9 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
          )}
        </div>
        {icon ? (
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/5">
            {icon}
          </div>
        ) : null}
      </div>
      {description || trend ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold",
                trendDirection === "up" && "bg-success/10 text-success",
                trendDirection === "down" && "bg-destructive/10 text-destructive",
                trendDirection === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              {trendDirection !== "neutral" ? (
                <ArrowUpRight
                  className={cn("size-3.5", trendDirection === "down" && "rotate-90")}
                  aria-hidden="true"
                />
              ) : null}
              {trend}
            </span>
          ) : null}
          {description ? <span className="text-muted-foreground">{description}</span> : null}
        </div>
      ) : null}
    </article>
  );
}
