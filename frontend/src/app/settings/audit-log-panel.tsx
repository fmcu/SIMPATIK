"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiClientError, apiClient, type AuditLogEntry } from "@/lib/api-client";
import {
  auditActionLabels,
  auditActions,
  auditEntityLabels,
  auditEntityTypes,
} from "@/lib/audit-labels";
import { errorMessage } from "@/lib/admin-helpers";

const emptyPagination = { page: 1, pageSize: 10, total: 0, totalPages: 0 };
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

export function AuditLogPanel() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [filters, setFilters] = useState({ search: "", action: "", entityType: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const result = await apiClient.audit.list({ page, pageSize: 10, ...filters });
      if (currentRequestId !== requestId.current) return;
      setRows(result.data);
      setPagination(result.pagination);
    } catch (loadError) {
      if (currentRequestId !== requestId.current) return;
      if (loadError instanceof ApiClientError && loadError.isForbidden) setDenied(true);
      else setError(errorMessage(loadError));
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters({ search: search.trim(), action, entityType });
  }

  function resetFilters() {
    setSearch("");
    setAction("");
    setEntityType("");
    setPage(1);
    setFilters({ search: "", action: "", entityType: "" });
  }

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { id: "time", header: "Waktu", cell: (row) => dateFormatter.format(new Date(row.createdAt)) },
    {
      id: "action",
      header: "Aktivitas",
      cell: (row) => auditActionLabels[row.action] ?? row.action,
    },
    {
      id: "entity",
      header: "Objek",
      cell: (row) => (
        <div>
          <p>{auditEntityLabels[row.entityType] ?? row.entityType}</p>
          <p className="text-xs text-muted-foreground">{row.entityId ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "actor",
      header: "Pelaku",
      cell: (row) =>
        row.actor ? (
          <div>
            <p className="font-medium">{row.actor.name}</p>
            <p className="text-xs text-muted-foreground">{row.actor.email}</p>
          </div>
        ) : (
          "Sistem"
        ),
    },
  ];

  if (denied)
    return (
      <section
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <h1 className="text-xl font-bold text-destructive">Akses ditolak</h1>
        <p className="mt-2 text-sm text-destructive">Anda tidak memiliki izin melihat audit log.</p>
      </section>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administrasi"
        title="Audit log"
        description="Pantau aktivitas penting dan perubahan administratif di seluruh sistem."
      />
      <FilterBar onSubmit={applyFilters} onReset={resetFilters}>
        <FormField id="audit-search" label="Cari audit">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="audit-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pelaku atau ID objek"
              className="pl-9"
            />
          </div>
        </FormField>
        <FormField id="audit-action" label="Aktivitas">
          <Select
            id="audit-action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          >
            <option value="">Semua aktivitas</option>
            {auditActions.map((value) => (
              <option key={value} value={value}>
                {auditActionLabels[value]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="audit-entity" label="Jenis objek">
          <Select
            id="audit-entity"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          >
            <option value="">Semua objek</option>
            {auditEntityTypes.map((value) => (
              <option key={value} value={value}>
                {auditEntityLabels[value]}
              </option>
            ))}
          </Select>
        </FormField>
      </FilterBar>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        caption="Daftar audit log"
        loading={loading}
        loadingLabel="Memuat audit log..."
        error={error ?? undefined}
        onRetry={() => void load()}
        pagination={pagination}
        onPageChange={setPage}
        emptyTitle="Audit log belum tersedia"
        emptyDescription="Belum ada aktivitas yang sesuai dengan filter saat ini."
      />
    </div>
  );
}
