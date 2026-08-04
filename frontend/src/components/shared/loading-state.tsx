import { AlertCircle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  label?: string;
  error?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function LoadingState({ label = "Memuat...", error = false, onRetry, className }: LoadingStateProps) {
  if (error) return <section className={cn("rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center", className)} role="alert"><AlertCircle className="mx-auto size-6 text-destructive" aria-hidden="true" /><p className="mt-3 text-sm text-destructive">{label}</p>{onRetry ? <Button type="button" variant="outline" className="mt-4" onClick={onRetry}><RotateCw className="size-4" />Coba lagi</Button> : null}</section>;
  return <section className={cn("space-y-3 rounded-xl border bg-card p-6", className)} role="status" aria-label={label}><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-5/6" /><span className="sr-only">{label}</span></section>;
}
