import type { AppRole } from "./auth-provider";

export type SettingsPanel = "audit" | "health" | "forbidden";
export type HealthState = {
  status: "available" | "unavailable";
  label: string;
  description: string;
};

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
    return {
      status: "available",
      label: endpoint === "live" ? "Aktif" : "Siap",
      description:
        endpoint === "live" ? "Proses aplikasi sedang berjalan." : "Aplikasi dan database siap melayani.",
    };
  }
  const message =
    typeof payload === "object" && payload !== null && "error" in payload &&
    typeof payload.error === "object" && payload.error !== null && "message" in payload.error &&
    typeof payload.error.message === "string"
      ? payload.error.message
      : endpoint === "live"
        ? "Proses aplikasi tidak tersedia."
        : "Aplikasi belum siap melayani.";
  return { status: "unavailable", label: endpoint === "live" ? "Tidak aktif" : "Tidak siap", description: message };
}
