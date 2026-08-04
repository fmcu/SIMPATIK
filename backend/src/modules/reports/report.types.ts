import type { ReportStatus } from "@prisma/client";

export type ReportListInput = {
  page: number;
  pageSize: number;
  periodId?: string | undefined;
  uptId?: string | undefined;
  status?: ReportStatus | undefined;
  uptScopeId?: string | undefined;
};

export type ReportCreateInput = {
  periodId: string;
  reportType: string;
  uptId: string;
  actorId: string;
};

export type ReportItemUpdateInput = {
  indicatorId: string;
  value?: string | null;
  narrative?: string | null;
};

export type ReportUpdateInput = {
  version: number;
  items: ReportItemUpdateInput[];
  uptScopeId: string;
  actorId: string;
};
