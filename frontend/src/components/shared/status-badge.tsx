import { Badge, type BadgeProps } from "@/components/ui/badge";

export type ReportStatus = "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "REVIEWED" | "APPROVED";

const statusLabels: Record<ReportStatus, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Diajukan",
  REVISION_REQUIRED: "Perlu revisi",
  REVIEWED: "Selesai direviu",
  APPROVED: "Disetujui",
};

const statusVariants: Record<ReportStatus, BadgeProps["variant"]> = {
  DRAFT: "secondary",
  SUBMITTED: "info",
  REVISION_REQUIRED: "warning",
  REVIEWED: "success",
  APPROVED: "default",
};

export interface StatusBadgeProps extends Omit<BadgeProps, "children"> {
  status: ReportStatus;
  label?: string;
}

export function StatusBadge({ status, label, ...props }: StatusBadgeProps) {
  return <Badge variant={statusVariants[status]} {...props}>{label ?? statusLabels[status]}</Badge>;
}
