import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
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
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTable<T>({ columns, data, getRowId, caption, loading = false, loadingLabel, emptyTitle = "Belum ada data", emptyDescription = "Data yang sesuai belum tersedia.", error, onRetry, pagination, onPageChange, className }: DataTableProps<T>) {
  if (loading) return <LoadingState label={loadingLabel} className={className} />;
  if (error) return <LoadingState label={error} error onRetry={onRetry} className={className} />;

  const paginationControls = pagination && onPageChange && pagination.totalPages > 1 ? (
    <nav aria-label="Paginasi tabel" className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span aria-live="polite">Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} data)</span>
      <span className="flex gap-2">
        <Button type="button" variant="outline" size="sm" aria-label="Halaman sebelumnya" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Sebelumnya</Button>
        <Button type="button" variant="outline" size="sm" aria-label="Halaman berikutnya" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Berikutnya</Button>
      </span>
    </nav>
  ) : null;

  if (!data.length) {
    return <div className={cn("space-y-3", className)}><EmptyState title={emptyTitle} description={emptyDescription} />{paginationControls}</div>;
  }

  return (
    <div className={cn("space-y-3", className)}>
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
      {paginationControls}
    </div>
  );
}
