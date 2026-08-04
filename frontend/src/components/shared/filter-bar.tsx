import type { FormEvent, ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface FilterBarProps {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onReset?: () => void;
  resetLabel?: string;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FilterBar({ children, onSubmit, onReset, resetLabel = "Reset filter", submitLabel = "Terapkan", loading = false, disabled = false, className }: FilterBarProps) {
  return (
    <form className={cn("rounded-xl border bg-card p-4", className)} onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>
      {(onSubmit || onReset) ? (
        <>
          <Separator className="my-4" />
          <div className="flex flex-wrap justify-end gap-2">
            {onReset ? <Button type="button" variant="ghost" onClick={onReset} disabled={disabled || loading}><RotateCcw className="size-4" />{resetLabel}</Button> : null}
            {onSubmit ? <Button type="submit" disabled={disabled || loading}>{loading ? "Memuat..." : submitLabel}</Button> : null}
          </div>
        </>
      ) : null}
    </form>
  );
}
