import type { AppRole } from "@/lib/auth-provider";
import { ApiClientError } from "@/lib/api-client";
export const roles: AppRole[] = ["PIMPINAN", "PRODUCT_OWNER", "PETUGAS_KANWIL", "KOORDINATOR_UPT", "PETUGAS_UPT", "ADMIN_SIMPATIK", "SYSTEM_ADMIN"];
export const roleLabels: Record<AppRole, string> = { PIMPINAN: "Pimpinan", PRODUCT_OWNER: "Product Owner", PETUGAS_KANWIL: "Petugas Kanwil", KOORDINATOR_UPT: "Koordinator UPT", PETUGAS_UPT: "Petugas UPT", ADMIN_SIMPATIK: "Admin SIMPATIK", SYSTEM_ADMIN: "System Administrator" };
export const errorMessage = (error: unknown) => error instanceof ApiClientError || error instanceof Error ? error.message : "Permintaan belum dapat diproses.";
export const dateLabel = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(date); };
