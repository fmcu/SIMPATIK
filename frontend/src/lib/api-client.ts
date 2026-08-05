import type { AppRole } from "@/lib/auth-provider";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:4000";

export type ApiFieldError = { field: string; message: string };
export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
export type ApiMeta = { requestId?: string; pagination?: Pagination; [key: string]: unknown };
export type UPT = { id: string; code: string; name: string; active: boolean };
export type User = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  uptId?: string | null;
  upt?: Pick<UPT, "id" | "code" | "name"> | null;
  active: boolean;
};
export type PeriodStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RequiredDocument = {
  id?: string;
  periodId?: string | null;
  indicatorId?: string | null;
  code: string;
  name: string;
  required: boolean;
  allowedMimeTypes: string[];
  maxSize: number;
  order: number;
  approvalStatus?: ApprovalStatus;
};
export type Indicator = {
  id: string;
  periodId: string;
  code: string;
  name: string;
  required: boolean;
  order: number;
  inputConfig?: Record<string, unknown> | null;
  approvalStatus?: ApprovalStatus;
  requiredDocuments?: RequiredDocument[];
};
export type Period = {
  id: string;
  name: string;
  startDate: string;
  dueDate: string;
  status: PeriodStatus;
  indicators?: Indicator[];
  requiredDocuments?: RequiredDocument[];
};
export type UPTInput = { code: string; name: string; active: boolean };
export type UserInput = {
  name: string;
  email: string;
  password?: string;
  role: AppRole;
  uptId?: string | null;
  active: boolean;
};
export type PeriodInput = {
  name: string;
  startDate: string;
  dueDate: string;
  status: PeriodStatus;
};
export type IndicatorInput = {
  code: string;
  name: string;
  required: boolean;
  order: number;
  inputConfig?: Record<string, unknown>;
};
export type RequiredDocumentInput = {
  periodId?: string;
  indicatorId?: string;
  code: string;
  name: string;
  required: boolean;
  allowedMimeTypes: string[];
  maxSize: number;
  order: number;
};
export type ReportStatus = "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "REVIEWED" | "APPROVED";
export type ReportAttachment = {
  id: string;
  reportItemId: string | null;
  requirementId: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: Pick<User, "id" | "name">;
  requirement: Pick<RequiredDocument, "id" | "code" | "name"> | null;
};
export type ReportItem = {
  id: string;
  indicatorId: string;
  value: string | null;
  narrative: string | null;
  indicator: Indicator;
};
export type ReportHistory = {
  id: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  note: string | null;
  createdAt: string;
  actor: Pick<User, "id" | "name">;
};
export type ReviewComment = {
  id: string;
  message: string;
  createdAt: string;
  createdBy: Pick<User, "id" | "name">;
};
export type Report = {
  id: string;
  uptId: string;
  periodId: string;
  reportType: string;
  status: ReportStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  reviewedBy?: Pick<User, "id" | "name"> | null;
  approvedBy?: Pick<User, "id" | "name"> | null;
  upt: Pick<UPT, "id" | "code" | "name">;
  period: Pick<Period, "id" | "name" | "startDate" | "dueDate" | "status">;
  createdBy: Pick<User, "id" | "name">;
  _count?: { items: number };
  items?: ReportItem[];
  attachments?: ReportAttachment[];
  comments?: ReviewComment[];
  histories?: ReportHistory[];
};
export type ReportCreateInput = { periodId: string; reportType: string };
export type ReportUpdateInput = {
  version: number;
  items: Array<{ indicatorId: string; value?: string | null; narrative?: string | null }>;
};
export type AttachmentUploadInput = {
  file: File;
  reportItemId?: string;
  requirementId?: string;
};
export type Paginated<T> = { data: T[]; meta: ApiMeta; pagination: Pagination };
export type DashboardQuery = {
  periodId?: string;
  uptId?: string;
  status?: ReportStatus;
  reportType?: string;
};
export type DashboardSummary = {
  period: Pick<Period, "id" | "name" | "startDate" | "dueDate">;
  filters: DashboardQuery & { periodId: string };
  counts: Array<{ status: ReportStatus; count: number }>;
  approvedCount: number;
  totalReports: number;
};
export type DashboardUptStatus = {
  upt: Pick<UPT, "id" | "code" | "name">;
  status: ReportStatus | "NOT_SENT";
  reportId: string | null;
  reportType: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  late: boolean;
};
export type DashboardByUpt = {
  period: Pick<Period, "id" | "name" | "startDate" | "dueDate">;
  status: DashboardUptStatus[];
  notSent: Array<Pick<UPT, "id" | "code" | "name">>;
  late: Array<Pick<UPT, "id" | "code" | "name">>;
};

type ApiErrorPayload = { error?: { code?: string; message?: string; fields?: ApiFieldError[] } };
type QueryValue = string | number | boolean | undefined;
type Options = Omit<RequestInit, "body" | "method"> & {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "API_ERROR",
    readonly fields: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get isUnauthorized() {
    return this.status === 401 || this.code === "AUTHENTICATION_REQUIRED";
  }

  get isForbidden() {
    return (
      this.status === 403 ||
      ["FORBIDDEN", "ROLE_NOT_ALLOWED", "UPT_SCOPE_FORBIDDEN"].includes(this.code)
    );
  }

  get isConflict() {
    return this.status === 409 || this.code === "CONFLICT";
  }
}

const root = `${API_URL.replace(/\/$/, "")}/api`;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toQuery = (params: Record<string, QueryValue>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : "";
};

const arrayData = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!isRecord(value)) return [];
  if (Array.isArray(value.items)) return value.items as T[];
  if (Array.isArray(value.data)) return value.data as T[];
  return [];
};

async function envelope<T>(path: string, options: Options = {}) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${root}${path.startsWith("/") ? path : `/${path}`}`, {
      ...options,
      credentials: "include",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiClientError(0, "Server belum dapat dihubungi.", "NETWORK_ERROR");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {}

  if (!response.ok) {
    const error = isRecord(payload) ? (payload.error as ApiErrorPayload["error"]) : undefined;
    const code =
      error?.code ??
      (response.status === 401
        ? "AUTHENTICATION_REQUIRED"
        : response.status === 403
          ? "FORBIDDEN"
          : response.status === 409
            ? "CONFLICT"
            : "API_ERROR");
    throw new ApiClientError(
      response.status,
      error?.message ?? "Permintaan belum dapat diproses.",
      code,
      error?.fields ?? [],
    );
  }

  return isRecord(payload) && "data" in payload
    ? (payload as { data: T; meta?: ApiMeta })
    : { data: payload as T, meta: {} };
}

const request = async <T>(path: string, options: Options = {}) =>
  (await envelope<T>(path, options)).data;

async function upload<T>(
  path: string,
  body: FormData,
  onProgress: (progress: number) => void,
): Promise<T> {
  const url = `${root}${path.startsWith("/") ? path : `/${path}`}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(new ApiClientError(0, "Server belum dapat dihubungi.", "NETWORK_ERROR"));
    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = xhr.responseText ? (JSON.parse(xhr.responseText) as unknown) : null;
      } catch {}
      if (xhr.status < 200 || xhr.status >= 300) {
        const error = isRecord(payload) ? (payload.error as ApiErrorPayload["error"]) : undefined;
        reject(
          new ApiClientError(
            xhr.status,
            error?.message ?? "Permintaan belum dapat diproses.",
            error?.code ?? "API_ERROR",
            error?.fields ?? [],
          ),
        );
        return;
      }
      onProgress(100);
      resolve(isRecord(payload) && "data" in payload ? (payload.data as T) : (payload as T));
    };
    xhr.send(body);
  });
}

async function download(path: string, filename: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${root}${path.startsWith("/") ? path : `/${path}`}`, {
      credentials: "include",
    });
  } catch {
    throw new ApiClientError(0, "Server belum dapat dihubungi.", "NETWORK_ERROR");
  }
  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {}
    const error = isRecord(payload) ? (payload.error as ApiErrorPayload["error"]) : undefined;
    throw new ApiClientError(
      response.status,
      error?.message ?? "File belum dapat diunduh.",
      error?.code ?? "API_ERROR",
    );
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function list<T>(
  path: string,
  params: Record<string, QueryValue> = {},
): Promise<Paginated<T>> {
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 25;
  const result = await envelope<unknown>(`${path}${toQuery(params)}`, {
    method: "GET",
    cache: "no-store",
  });
  const nested = isRecord(result.data) ? result.data : undefined;
  const meta = result.meta ?? (isRecord(nested?.meta) ? (nested.meta as ApiMeta) : {});
  const data = arrayData<T>(result.data);
  const pagination =
    meta.pagination ??
    (isRecord(nested?.pagination)
      ? (nested.pagination as Pagination)
      : {
          page,
          pageSize,
          total: data.length,
          totalPages: data.length ? Math.ceil(data.length / pageSize) : 0,
        });
  return { data, meta, pagination };
}

export const apiClient = {
  upts: {
    list: (params: Record<string, QueryValue> = {}) => list<UPT>("/upts", params),
    create: (body: UPTInput) => request<UPT>("/upts", { method: "POST", body }),
    update: (id: string, body: Partial<UPTInput>) =>
      request<UPT>(`/upts/${id}`, { method: "PATCH", body }),
    activate: (id: string) => request<UPT>(`/upts/${id}/activate`, { method: "POST" }),
    deactivate: (id: string) => request<UPT>(`/upts/${id}/deactivate`, { method: "POST" }),
  },
  users: {
    list: (params: Record<string, QueryValue> = {}) => list<User>("/users", params),
    create: (body: UserInput) => request<User>("/users", { method: "POST", body }),
    update: (id: string, body: Partial<UserInput>) =>
      request<User>(`/users/${id}`, { method: "PATCH", body }),
    activate: (id: string) => request<User>(`/users/${id}/activate`, { method: "POST" }),
    deactivate: (id: string) => request<User>(`/users/${id}/deactivate`, { method: "POST" }),
  },
  periods: {
    list: (params: Record<string, QueryValue> = {}) => list<Period>("/periods", params),
    get: (id: string) => request<Period>(`/periods/${id}`, { method: "GET", cache: "no-store" }),
    create: (body: PeriodInput) => request<Period>("/periods", { method: "POST", body }),
    update: (id: string, body: Partial<PeriodInput>) =>
      request<Period>(`/periods/${id}`, { method: "PATCH", body }),
  },
  indicators: {
    list: (id: string) =>
      request<Indicator[]>(`/periods/${id}/indicators`, { method: "GET", cache: "no-store" }),
    create: (id: string, body: IndicatorInput) =>
      request<Indicator>(`/periods/${id}/indicators`, { method: "POST", body }),
    update: (id: string, body: Partial<IndicatorInput>) =>
      request<Indicator>(`/indicators/${id}`, { method: "PATCH", body }),
    approve: (id: string) =>
      request<Indicator>(`/indicators/${id}/approve`, {
        method: "POST",
        body: { status: "APPROVED" },
      }),
  },
  documents: {
    list: (id: string) =>
      request<RequiredDocument[]>(`/periods/${id}/documents`, { method: "GET", cache: "no-store" }),
    create: (id: string, body: RequiredDocumentInput) =>
      request<RequiredDocument>(`/periods/${id}/documents`, { method: "POST", body }),
    update: (id: string, body: Partial<RequiredDocumentInput>) =>
      request<RequiredDocument>(`/documents/${id}`, { method: "PATCH", body }),
    approve: (id: string) =>
      request<RequiredDocument>(`/documents/${id}/approve`, {
        method: "POST",
        body: { status: "APPROVED" },
      }),
  },
  reports: {
    list: (params: Record<string, QueryValue> = {}) => list<Report>("/reports", params),
    get: (id: string) => request<Report>(`/reports/${id}`, { method: "GET", cache: "no-store" }),
    create: (body: ReportCreateInput) => request<Report>("/reports", { method: "POST", body }),
    update: (id: string, body: ReportUpdateInput) =>
      request<Report>(`/reports/${id}`, { method: "PATCH", body }),
    submit: (id: string) => request<Report>(`/reports/${id}/submit`, { method: "POST" }),
    addReviewComment: (id: string, body: { message: string }) =>
      request<Report>(`/reports/${id}/comments`, { method: "POST", body }),
    requestRevision: (id: string, body: { message: string }) =>
      request<Report>(`/reports/${id}/request-revision`, { method: "POST", body }),
    markReviewed: (id: string) =>
      request<Report>(`/reports/${id}/mark-reviewed`, { method: "POST" }),
    approve: (id: string) => request<Report>(`/reports/${id}/approve`, { method: "POST" }),
    validateCompleteness: (id: string) =>
      request<{ valid: true }>(`/reports/${id}/completeness`, { method: "GET", cache: "no-store" }),
  },
  attachments: {
    upload: (id: string, body: AttachmentUploadInput, onProgress: (progress: number) => void) => {
      const formData = new FormData();
      formData.set("file", body.file);
      if (body.reportItemId) formData.set("reportItemId", body.reportItemId);
      if (body.requirementId) formData.set("requirementId", body.requirementId);
      return upload<ReportAttachment>(`/reports/${id}/attachments`, formData, onProgress);
    },
    download: (attachment: Pick<ReportAttachment, "id" | "originalName">) =>
      download(`/attachments/${attachment.id}/download`, attachment.originalName),
    delete: (id: string) => request<{ id: string }>(`/attachments/${id}`, { method: "DELETE" }),
  },
  dashboard: {
    summary: (params: DashboardQuery = {}) =>
      request<DashboardSummary>(`/dashboard/summary${toQuery(params)}`, {
        method: "GET",
        cache: "no-store",
      }),
    byUpt: (params: DashboardQuery = {}) =>
      request<DashboardByUpt>(`/dashboard/by-upt${toQuery(params)}`, {
        method: "GET",
        cache: "no-store",
      }),
  },
  exports: {
    reportsCsv: (params: DashboardQuery = {}) =>
      download(`/exports/reports.csv${toQuery(params)}`, "reports.csv"),
  },
};
