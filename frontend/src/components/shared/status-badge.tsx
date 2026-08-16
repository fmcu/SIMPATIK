import { Badge, type BadgeProps } from "@/components/ui/badge";

export type ReportStatus = "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "REVIEWED" | "APPROVED";
export type Status = ReportStatus | "ACTIVE" | "CLOSED" | "INACTIVE" | "PENDING" | "REJECTED";

const statusLabels: Record<Status, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Diajukan",
  REVISION_REQUIRED: "Perlu revisi",
  REVIEWED: "Selesai direviu",
  APPROVED: "Disetujui",
  ACTIVE: "Aktif",
  CLOSED: "Ditutup",
  INACTIVE: "Nonaktif",
  PENDING: "Menunggu pengesahan",
  REJECTED: "Ditolak",
};

const statusVariants: Record<Status, BadgeProps["variant"]> = {
  DRAFT: "secondary",
  SUBMITTED: "info",
  REVISION_REQUIRED: "warning",
  REVIEWED: "success",
  APPROVED: "default",
  ACTIVE: "active",
  CLOSED: "secondary",
  INACTIVE: "warning",
  PENDING: "secondary",
  REJECTED: "warning",
};

export interface StatusBadgeProps extends Omit<BadgeProps, "children"> {
  status: Status;
  label?: string;
}

export function StatusBadge({ status, label, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status]} {...props}>
      {label ?? statusLabels[status]}
    </Badge>
  );
}
