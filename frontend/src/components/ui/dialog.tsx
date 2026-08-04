"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogContextValue = { open: boolean; setOpen: (open: boolean) => void };
const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("Dialog components must be used within Dialog");
  return context;
}

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Dialog({ children, open: controlledOpen, defaultOpen = false, onOpenChange }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(({ asChild = false, onClick, children, ...props }, ref) => {
  const { setOpen } = useDialogContext();
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => { onClick?.(event); if (!event.defaultPrevented) setOpen(true); };
  if (asChild && React.isValidElement<{ onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void }>(children)) {
    return React.cloneElement(children, { ...props, onClick: (event) => { children.props.onClick?.(event); handleClick(event); } });
  }
  return <button ref={ref} type="button" onClick={handleClick} {...props}>{children}</button>;
});
DialogTrigger.displayName = "DialogTrigger";

function DialogPortal({ children }: { children: React.ReactNode }) {
  return children;
}

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useDialogContext();
  React.useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Tutup dialog" className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
      <div ref={ref} role="dialog" aria-modal="true" className={cn("relative z-10 w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl", className)} {...props}>
        {children}
        <DialogClose className="absolute right-4 top-4" aria-label="Tutup dialog"><X className="size-4" /></DialogClose>
      </div>
    </div>
  );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("space-y-2", className)} {...props} />;
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => <h2 ref={ref} className={cn("text-lg font-semibold", className)} {...props} />);
DialogTitle.displayName = "DialogTitle";
const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />);
DialogDescription.displayName = "DialogDescription";
interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(({ asChild = false, className, onClick, children, ...props }, ref) => {
  const { setOpen } = useDialogContext();
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => { onClick?.(event); if (!event.defaultPrevented) setOpen(false); };
  if (asChild && React.isValidElement<{ onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void }>(children)) {
    return React.cloneElement(children, { ...props, onClick: (event) => { children.props.onClick?.(event); handleClick(event); } });
  }
  return <Button ref={ref} variant="ghost" size="icon" className={className} onClick={handleClick} {...props}>{children}</Button>;
});
DialogClose.displayName = "DialogClose";

export { Dialog, DialogTrigger, DialogPortal, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose };
