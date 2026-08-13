import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <section
      className={cn("rounded-xl border border-dashed bg-card p-8 text-center shadow-sm", className)}
      aria-live="polite"
    >
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
        {icon ?? <Inbox className="size-5" aria-hidden="true" />}
      </div>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

export function EmptyStateAction({ children, ...props }: React.ComponentProps<typeof Button>) {
  return <Button {...props}>{children}</Button>;
}
