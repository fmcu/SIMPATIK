import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  caption?: string;
  loading?: boolean;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export function DataTable<T>({ columns, data, getRowId, caption, loading = false, loadingLabel, emptyTitle = "Belum ada data", emptyDescription = "Data yang sesuai belum tersedia.", error, onRetry, className }: DataTableProps<T>) {
  if (loading) return <LoadingState label={loadingLabel} className={className} />;
  if (error) return <LoadingState label={error} error onRetry={onRetry} className={className} />;
  if (!data.length) return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />;

  return (
    <div className={cn("space-y-2", className)}>
      <Table>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <TableHeader>
          <TableRow>
            {columns.map((column) => <TableHead key={column.id} className={column.className}>{column.header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((column) => <TableCell key={column.id} className={column.className}>{column.cell(row)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
