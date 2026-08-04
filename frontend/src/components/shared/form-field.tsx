import type { ReactNode } from "react";

import { FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  id: string;
  label: string;
  children: ReactNode;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FormField({ id, label, children, description, error, required = false, disabled = false, className }: FormFieldProps) {
  return (
    <FormItem className={cn(disabled && "opacity-60", className)}>
      <FormLabel htmlFor={id}>
        {label}{required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
        {required ? <span className="sr-only"> wajib diisi</span> : null}
      </FormLabel>
      {children}
      {description && !error ? <FormDescription id={`${id}-description`}>{description}</FormDescription> : null}
      {error ? <FormMessage id={`${id}-error`}>{error}</FormMessage> : null}
    </FormItem>
  );
}
