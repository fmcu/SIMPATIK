"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import type { ReportHistory } from "@/lib/api-client";

function dateTimeLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(date);
}

export function ReportHistoryTimeline({ histories }: { histories: ReportHistory[] }) {
  if (!histories.length) {
    return <p className="mt-4 text-sm text-muted-foreground">Belum ada histori status.</p>;
  }

  return (
    <ol className="mt-4 space-y-4 border-l pl-5">
      {histories.map((history) => (
        <li key={history.id} className="relative">
          <span
            className="absolute -left-[1.7rem] top-1 size-3 rounded-full bg-primary"
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={history.toStatus} />
            <span className="text-sm text-muted-foreground">
              {history.fromStatus ? `${history.fromStatus} · ` : ""}
              oleh {history.actor.name} · {dateTimeLabel(history.createdAt)} WIB
            </span>
          </div>
          {history.note ? <p className="mt-2 whitespace-pre-wrap text-sm">{history.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
