"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
};
type ToastContextValue = {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  dismiss: (id: string) => void;
};
const ToastContext = React.createContext<ToastContextValue | null>(null);

function ToastProvider({
  children,
  duration = 5000,
}: {
  children: React.ReactNode;
  duration?: number;
}) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);
  const dismiss = (id: string) =>
    setToasts((current) => current.filter((toast) => toast.id !== id));
  const addToast = (toast: Omit<ToastData, "id">) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => dismiss(id), duration);
  };
  return (
    <ToastContext.Provider value={{ toasts, addToast, dismiss }}>{children}</ToastContext.Provider>
  );
}

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return { toast: context.addToast, dismiss: context.dismiss };
}

function ToastViewport() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("ToastViewport must be used within ToastProvider");
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
    >
      {context.toasts.map((toast) => (
        <Toast key={toast.id} data={toast} onClose={() => context.dismiss(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ data, onClose }: { data: ToastData; onClose: () => void }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border bg-card p-4 pr-12 shadow-lg",
        data.variant === "success" && "border-success/40",
        data.variant === "error" && "border-destructive/40",
      )}
    >
      <div className="font-semibold">{data.title ?? "Pemberitahuan"}</div>
      {data.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2"
        onClick={onClose}
        aria-label="Tutup notifikasi"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

const ToastTitle = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("font-semibold", className)} {...props} />
);
const ToastDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);
const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => <Button ref={ref} type="button" variant="ghost" size="icon" {...props} />);
ToastClose.displayName = "ToastClose";

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose, useToast };
