import { TimesheetStatus } from "../../generated/prisma/enums";

export type StatusBadgeMeta = {
  label: string;
  className: string;
};

const STATUS_LABELS: Record<TimesheetStatus, string> = {
  OPEN: "Aberto",
  SUBMITTED: "Enviado",
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export const STATUS_BADGE_STYLES: Record<TimesheetStatus, string> = {
  OPEN: "border-border bg-muted text-muted-foreground dark:bg-muted/70",
  SUBMITTED:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/15 dark:text-blue-300",
  PENDING:
    "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-200",
  APPROVED:
    "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-200",
  REJECTED:
    "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/15",
};

export function getStatusBadgeMeta(status: TimesheetStatus): StatusBadgeMeta {
  return {
    label: STATUS_LABELS[status],
    className: STATUS_BADGE_STYLES[status],
  };
}
