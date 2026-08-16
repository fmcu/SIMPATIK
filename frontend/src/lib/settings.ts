import type { AppRole } from "./auth-provider";

export type SettingsPanel = "audit" | "health" | "forbidden";
export type HealthState = {
  status: "available" | "unavailable";
  label: string;
  description: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function settingsPanelForRole(role?: AppRole): SettingsPanel {
  if (role === "ADMIN_SIMPATIK") return "audit";
  if (role === "SYSTEM_ADMIN") return "health";
  return "forbidden";
}

export function healthStateFromResponse(
  endpoint: "live" | "ready",
  statusCode: number,
  payload: unknown,
): HealthState {
  if (statusCode >= 200 && statusCode < 300) {
    const data = isRecord(payload) ? payload.data : undefined;
    if (isRecord(data) && data.status === "ok") {
      return {
        status: "available",
        label: "Aktif",
        description: "Proses aplikasi sedang berjalan.",
      };
    }
    if (
      isRecord(data) &&
      data.status === "ready" &&
      isRecord(data.dependencies) &&
      data.dependencies.database === "ready" &&
      data.dependencies.storage === "ready"
    ) {
      return {
        status: "available",
        label: "Siap",
        description: "Aplikasi, database, dan penyimpanan file privat siap melayani.",
      };
    }
    return {
      status: "unavailable",
      label: endpoint === "live" ? "Tidak aktif" : "Tidak siap",
      description: "Respons server tidak valid.",
    };
  }
  const message =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
      ? payload.error.message
      : endpoint === "live"
        ? "Proses aplikasi tidak tersedia."
        : "Aplikasi, database, atau penyimpanan file privat belum siap melayani.";
  return {
    status: "unavailable",
    label: endpoint === "live" ? "Tidak aktif" : "Tidak siap",
    description: message,
  };
}
