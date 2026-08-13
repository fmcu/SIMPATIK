import { cn } from "@/lib/utils";

interface SimpatikLogoProps {
  className?: string;
  showText?: boolean;
  compact?: boolean;
  inverse?: boolean;
}

export function SimpatikLogo({
  className,
  showText = true,
  compact = false,
  inverse = false,
}: SimpatikLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary to-[#1c4a80] shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="size-6 text-gold" aria-hidden="true">
          <path
            d="M12 2 4 5.8v5.9c0 4.5 3.3 8.7 8 10.3 4.7-1.6 8-5.8 8-10.3V5.8L12 2Z"
            fill="currentColor"
          />
          <path
            d="M8.25 9.1h7.5M8.25 12h7.5M8.25 14.9h4.4"
            stroke="hsl(217 71% 22%)"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <path
            d="m15.2 15.3 1.15 1.15 2.25-2.55"
            stroke="hsl(217 71% 22%)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showText ? (
        <span className="min-w-0 leading-none">
          <span
            className={cn(
              "block text-sm font-extrabold tracking-[0.08em]",
              inverse && "text-white",
            )}
          >
            SIMPATIK
          </span>
          {!compact ? (
            <span
              className={cn(
                "mt-1 block truncate text-[10px] font-medium text-muted-foreground",
                inverse && "text-sidebar-foreground/60",
              )}
            >
              Monitoring Kepatuhan
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
