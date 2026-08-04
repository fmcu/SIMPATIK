"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SheetContextValue = { open: boolean; setOpen: (open: boolean) => void };
const SheetContext = React.createContext<SheetContextValue | null>(null);
function useSheetContext() {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("Sheet components must be used within Sheet");
  return context;
}

function Sheet({ children, open: controlledOpen, defaultOpen = false, onOpenChange }: { children: React.ReactNode; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (nextOpen: boolean) => { if (controlledOpen === undefined) setUncontrolledOpen(nextOpen); onOpenChange?.(nextOpen); };
  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>;
}

const SheetTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ onClick, ...props }, ref) => {
  const { setOpen } = useSheetContext();
  return <button ref={ref} type="button" onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) setOpen(true); }} {...props} />;
});
SheetTrigger.displayName = "SheetTrigger";

const SheetContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { side?: "top" | "right" | "bottom" | "left" }>(({ className, side = "right", children, ...props }, ref) => {
  const { open, setOpen } = useSheetContext();
  React.useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);
  if (!open) return null;
  const position = { top: "inset-x-0 top-0 border-b", right: "inset-y-0 right-0 w-4/5 max-w-sm border-l", bottom: "inset-x-0 bottom-0 border-t", left: "inset-y-0 left-0 w-4/5 max-w-sm border-r" }[side];
  return <div className="fixed inset-0 z-50" role="presentation"><button type="button" aria-label="Tutup panel" className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} /><div ref={ref} role="dialog" aria-modal="true" className={cn("absolute bg-card p-6 shadow-xl", position, className)} {...props}>{children}<SheetClose className="absolute right-4 top-4" aria-label="Tutup panel"><X className="size-4" /></SheetClose></div></div>;
});
SheetContent.displayName = "SheetContent";
const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("space-y-2", className)} {...props} />;
const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("mt-6 flex flex-col gap-2", className)} {...props} />;
const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => <h2 ref={ref} className={cn("text-lg font-semibold", className)} {...props} />);
SheetTitle.displayName = "SheetTitle";
const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />);
SheetDescription.displayName = "SheetDescription";
const SheetClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = useSheetContext();
  return <Button ref={ref} variant="ghost" size="icon" className={className} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) setOpen(false); }} {...props} />;
});
SheetClose.displayName = "SheetClose";

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, SheetClose };
