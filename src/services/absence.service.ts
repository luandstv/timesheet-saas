import { DateTime } from "luxon";
import { TIMEZONE } from "@/lib/constants";
import { dateOnlyStart, formatDateOnly } from "@/lib/date-only";
import prisma from "@/lib/prisma";
import {
  audit,
  lockPerson,
  lockWorkspace,
  requireMember,
  requireReview,
} from "./workspace.service";

type AbsenceType =
  | "MEDICAL_LEAVE"
  | "VACATION"
  | "COMPENSATORY_OFF"
  | "DAY_OFF"
  | "JUSTIFIED_ABSENCE"
  | "UNJUSTIFIED_ABSENCE"
  | "BEREAVEMENT"
  | "MATERNITY"
  | "PATERNITY"
  | "OTHER";

type CreateInput = {
  startDate: string;
  endDate: string;
  type: AbsenceType;
  reason: string;
};

function parseDate(value: string) {
  const date = DateTime.fromFormat(value, "yyyy-MM-dd", { zone: TIMEZONE });
  if (!date.isValid || date.toFormat("yyyy-MM-dd") !== value)
    throw new Error("Informe um período de datas válido.");
  return date;
}

export class AbsenceService {
  static async create(actorId: string, workspaceId: string, input: CreateInput) {
    const start = parseDate(input.startDate);
    const end = parseDate(input.endDate);
    if (end < start)
      throw new Error("A data final deve ser igual ou posterior à inicial.");
    const reason = input.reason.trim();
    if (reason.length < 3)
      throw new Error("Explique a ausência com pelo menos 3 caracteres.");

    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        await lockPerson(tx, actorId);
        const member = await requireMember(tx, workspaceId, actorId, true);
        const startDate = dateOnlyStart(start);
        const endDate = dateOnlyStart(end);
        const overlap = await tx.absences.findFirst({
          where: {
            userId: actorId,
            workspaceId,
            status: { in: ["PENDING", "APPROVED"] },
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        });
        if (overlap) throw new Error("Já existe uma ausência neste intervalo.");

        const autoApproved =
          member.workspace.kind === "PERSONAL" || member.role === "OWNER";
        const absence = await tx.absences.create({
          data: {
            userId: actorId,
            workspaceId,
            startDate,
            endDate,
            type: input.type,
            reason,
            status: autoApproved ? "APPROVED" : "PENDING",
            approvedById: autoApproved ? actorId : null,
          },
        });
        await audit(tx, workspaceId, actorId, actorId, "ABSENCE_CREATED", {
          absenceId: absence.id,
          startDate: input.startDate,
          endDate: input.endDate,
          type: input.type,
          status: absence.status,
        });
        return absence;
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async decide(
    actorId: string,
    workspaceId: string,
    absenceId: string,
    decision: "APPROVED" | "REJECTED",
    reason: string,
  ) {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) throw new Error("Informe um motivo para a decisão.");

    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        const absence = await tx.absences.findFirst({
          where: { id: absenceId, workspaceId },
        });
        if (!absence) throw new Error("Ausência não encontrada neste espaço.");
        await lockPerson(tx, absence.userId);
        await requireReview(tx, workspaceId, actorId, absence.userId);
        if (absence.status !== "PENDING")
          throw new Error("Esta ausência já foi decidida.");

        const updated = await tx.absences.update({
          where: { id: absence.id },
          data: {
            status: decision,
            approvedById: decision === "APPROVED" ? actorId : null,
          },
        });
        await audit(tx, workspaceId, actorId, absence.userId, `ABSENCE_${decision}`, {
          absenceId: absence.id,
          reason: trimmedReason,
          period: `${formatDateOnly(absence.startDate)}:${formatDateOnly(absence.endDate)}`,
        });
        await tx.userNotification.create({
          data: {
            userId: absence.userId,
            workspaceId,
            type: `ABSENCE_${decision}`,
            title: decision === "APPROVED" ? "Ausência aprovada" : "Ausência rejeitada",
            message: `Sua ausência de ${formatDateOnly(absence.startDate)} a ${formatDateOnly(absence.endDate)} foi ${decision === "APPROVED" ? "aprovada" : "rejeitada"}.`,
            href: "/absences",
          },
        });
        return updated;
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }
}
