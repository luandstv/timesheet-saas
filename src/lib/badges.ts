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
  OPEN: "bg-[#eeede9] text-[#52514e] dark:bg-[#252523] dark:text-[#c3c2b7]",
  SUBMITTED: "bg-[#eceff6] text-[#1b6cc9] dark:bg-[#1e3c69] dark:text-[#5eabff]",
  PENDING: "bg-[#fcf3eb] text-[#9e5b00] dark:bg-[#7b5819] dark:text-[#ffd34d]",
  APPROVED: "bg-[#ecf2eb] text-[#007d00] dark:bg-[#185117] dark:text-[#51d14b]",
  REJECTED: "bg-[#f6edec] text-[#c93435] dark:bg-[#672323] dark:text-[#ff7e77]",
};

export function getStatusBadgeMeta(status: TimesheetStatus): StatusBadgeMeta {
  return {
    label: STATUS_LABELS[status],
    className: STATUS_BADGE_STYLES[status],
  };
}
