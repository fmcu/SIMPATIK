import type { AppRole } from "./auth-provider";

export type NavigationIcon =
  | "dashboard"
  | "components"
  | "reports"
  | "validation"
  | "review"
  | "approval"
  | "users"
  | "upts"
  | "periods"
  | "settings";

export type NavigationItem = {
  label: string;
  href: string;
  icon: NavigationIcon;
  roles: readonly AppRole[];
};

export const navigationItems: readonly NavigationItem[] = [
  {
    label: "Dasbor",
    href: "/",
    icon: "dashboard",
    roles: [
      "PIMPINAN",
      "PRODUCT_OWNER",
      "PETUGAS_KANWIL",
      "KOORDINATOR_UPT",
      "PETUGAS_UPT",
      "ADMIN_SIMPATIK",
    ],
  },
  {
    label: "Katalog komponen",
    href: "/components",
    icon: "components",
    roles: [
      "PIMPINAN",
      "PRODUCT_OWNER",
      "PETUGAS_KANWIL",
      "KOORDINATOR_UPT",
      "PETUGAS_UPT",
      "ADMIN_SIMPATIK",
      "SYSTEM_ADMIN",
    ],
  },
  {
    label: "Laporan",
    href: "/reports",
    icon: "reports",
    roles: ["PIMPINAN", "PRODUCT_OWNER", "PETUGAS_KANWIL", "KOORDINATOR_UPT", "PETUGAS_UPT"],
  },
  {
    label: "Validasi laporan",
    href: "/reports/validation",
    icon: "validation",
    roles: ["KOORDINATOR_UPT"],
  },
  {
    label: "Reviu Kanwil",
    href: "/reports/review",
    icon: "review",
    roles: ["PETUGAS_KANWIL"],
  },
  {
    label: "Persetujuan laporan",
    href: "/reports/approval",
    icon: "approval",
    roles: ["PRODUCT_OWNER"],
  },
  { label: "Pengguna", href: "/users", icon: "users", roles: ["ADMIN_SIMPATIK"] },
  { label: "UPT", href: "/upts", icon: "upts", roles: ["ADMIN_SIMPATIK"] },
  {
    label: "Periode",
    href: "/periods",
    icon: "periods",
    roles: ["ADMIN_SIMPATIK", "PRODUCT_OWNER"],
  },
  {
    label: "Pengaturan",
    href: "/settings",
    icon: "settings",
    roles: ["ADMIN_SIMPATIK", "SYSTEM_ADMIN"],
  },
];
