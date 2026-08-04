"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type DropdownContextValue = { open: boolean; setOpen: (open: boolean) => void };
const DropdownContext = React.createContext<DropdownContextValue | null>(null);
function useDropdownContext() {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("Dropdown menu components must be used within DropdownMenu");
  return context;
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <DropdownContext.Provider value={{ open, setOpen }}>{children}</DropdownContext.Provider>;
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ onClick, ...props }, ref) => {
  const { open, setOpen } = useDropdownContext();
  return <button ref={ref} type="button" aria-haspopup="menu" aria-expanded={open} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) setOpen(!open); }} {...props} />;
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

function DropdownMenuContent({ className, align = "end", ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end" }) {
  const { open } = useDropdownContext();
  if (!open) return null;
  return <div role="menu" className={cn("absolute right-0 z-40 mt-2 min-w-48 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg", align === "start" && "left-0 right-auto", align === "center" && "left-1/2 right-auto -translate-x-1/2", className)} {...props} />;
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = useDropdownContext();
  return <button ref={ref} type="button" role="menuitem" className={cn("flex w-full items-center rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-50", className)} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) setOpen(false); }} {...props} />;
});
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground", className)} {...props} />;
const DropdownMenuSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div role="separator" className={cn("-mx-1.5 my-1 h-px bg-border", className)} {...props} />;
const DropdownMenuGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div role="group" className={className} {...props} />;

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, ChevronDown };
