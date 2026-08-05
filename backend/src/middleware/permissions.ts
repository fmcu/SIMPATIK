import type { Role } from "@simpatik/contracts";

export const roles = {
  allBusiness: ["PIMPINAN", "PRODUCT_OWNER", "PETUGAS_KANWIL", "KOORDINATOR_UPT", "PETUGAS_UPT"],
  reportReaders: ["PIMPINAN", "PRODUCT_OWNER", "PETUGAS_KANWIL", "KOORDINATOR_UPT", "PETUGAS_UPT"],
  configurationReaders: [
    "PIMPINAN",
    "PRODUCT_OWNER",
    "PETUGAS_KANWIL",
    "KOORDINATOR_UPT",
    "PETUGAS_UPT",
    "ADMIN_SIMPATIK",
  ],
  dashboardReaders: [
    "PIMPINAN",
    "PRODUCT_OWNER",
    "PETUGAS_KANWIL",
    "KOORDINATOR_UPT",
    "PETUGAS_UPT",
    "ADMIN_SIMPATIK",
  ],
  uptReaders: [
    "PIMPINAN",
    "PRODUCT_OWNER",
    "PETUGAS_KANWIL",
    "KOORDINATOR_UPT",
    "PETUGAS_UPT",
    "ADMIN_SIMPATIK",
  ],
  exportReaders: [
    "PIMPINAN",
    "PRODUCT_OWNER",
    "PETUGAS_KANWIL",
    "KOORDINATOR_UPT",
    "ADMIN_SIMPATIK",
  ],
  admin: ["ADMIN_SIMPATIK"],
  productOwner: ["PRODUCT_OWNER"],
  kanwilReviewer: ["PETUGAS_KANWIL"],
  coordinator: ["KOORDINATOR_UPT"],
  reportValidator: ["KOORDINATOR_UPT", "PETUGAS_UPT"],
  uptEditor: ["PETUGAS_UPT"],
} as const satisfies Record<string, readonly Role[]>;

export const authorizationMatrix = {
  usersRead: roles.admin,
  usersWrite: roles.admin,
  uptRead: roles.uptReaders,
  uptWrite: roles.admin,
  periodRead: roles.configurationReaders,
  periodWrite: roles.admin,
  indicatorApprove: roles.productOwner,
  documentApprove: roles.productOwner,
  reportRead: roles.reportReaders,
  reportCreate: roles.uptEditor,
  reportUpdate: roles.uptEditor,
  reportHistory: roles.reportReaders,
  reportValidate: roles.reportValidator,
  reportSubmit: roles.coordinator,
  reportReview: roles.kanwilReviewer,
  reportApprove: roles.productOwner,
  attachmentUpload: roles.uptEditor,
  attachmentRead: roles.reportReaders,
  attachmentDelete: roles.uptEditor,
  dashboardRead: roles.dashboardReaders,
  exportRead: roles.exportReaders,
} as const;

export type AuthorizationAction = keyof typeof authorizationMatrix;

export function rolesFor(action: AuthorizationAction): readonly Role[] {
  return authorizationMatrix[action];
}
