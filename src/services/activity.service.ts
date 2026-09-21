import { DateTime } from "luxon";

import prisma from "@/lib/prisma";
import { FHCN_END_HOUR, FHCN_START_HOUR, TIMEZONE } from "@/lib/constants";

import { assertMonthOpen } from "./effective-time.service";
import { requireMember } from "./workspace.service";
import { TimeEntryService } from "./time-entry.service";

export type ActivityInput = {
  description: string;
  incidentCode?: string | null;
  startTime: string;
  endTime: string;
};

function parseDateTime(value: string, label: string) {
  const parsed = DateTime.fromISO(value, { zone: TIMEZONE });
  if (!parsed.isValid) throw new Error(`Informe um horário válido para ${label}.`);
  return parsed;
}

function periodFor(date: DateTime) {
  return date.hour >= FHCN_START_HOUR || date.hour < FHCN_END_HOUR ? "FHCN" : "FHC";
}

function durationInMinutes(start: DateTime, end: DateTime) {
  const duration = Math.round(end.diff(start, "minutes").minutes);
  if (duration < 1 || duration > 24 * 60) {
    throw new Error("A atividade deve durar entre 1 minuto e 24 horas.");
  }
  return duration;
}

function validateInput(input: ActivityInput) {
  const description = input.description.trim();
  if (description.length < 3 || description.length > 500) {
    throw new Error("Descreva a atividade entre 3 e 500 caracteres.");
  }

  const incidentCode = input.incidentCode?.trim() || null;
  if (incidentCode && incidentCode.length > 80) {
    throw new Error("O identificador do incidente deve ter no máximo 80 caracteres.");
  }

  const start = parseDateTime(input.startTime, "o início");
  const end = parseDateTime(input.endTime, "o fim");
  const now = DateTime.now().setZone(TIMEZONE);
  if (start > now || end > now) {
    throw new Error("A atividade não pode estar no futuro.");
  }
  if (end <= start) {
    throw new Error("O fim da atividade deve ser posterior ao início.");
  }

  return {
    description,
    incidentCode,
    start,
    end,
    durationMinutes: durationInMinutes(start, end),
  };
}

export class ActivityService {
  static async create(actorId: string, workspaceId: string, input: ActivityInput) {
    const validated = validateInput(input);

    return prisma.$transaction(
      async (tx) => {
        await requireMember(tx, workspaceId, actorId, true);
        const timeSheet = await TimeEntryService.getOrCreateTimeSheet(
          actorId,
          validated.start,
          tx,
          workspaceId,
        );
        await assertMonthOpen(tx, workspaceId, actorId, timeSheet.date);
        if (timeSheet.status !== "OPEN") {
          throw new Error("Esta jornada está fechada para novos acionamentos.");
        }

        return tx.activity.create({
          data: {
            userId: actorId,
            workspaceId,
            timeSheetId: timeSheet.id,
            description: validated.description,
            incidentCode: validated.incidentCode,
            startTime: validated.start.toJSDate(),
            endTime: validated.end.toJSDate(),
            durationMinutes: validated.durationMinutes,
            period: periodFor(validated.start),
          },
        });
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async listDay(userId: string, workspaceId: string, date: DateTime) {
    const localDate = date.setZone(TIMEZONE);
    const day = localDate.startOf("day").toJSDate();
    const nextDay = localDate.plus({ days: 1 }).startOf("day").toJSDate();

    return prisma.activity.findMany({
      where: {
        userId,
        workspaceId,
        startTime: { gte: day, lt: nextDay },
      },
      orderBy: { startTime: "desc" },
    });
  }

  static async remove(actorId: string, workspaceId: string, activityId: string) {
    return prisma.$transaction(
      async (tx) => {
        const activity = await tx.activity.findFirst({
          where: { id: activityId, userId: actorId, workspaceId },
        });
        if (!activity) throw new Error("Atividade não encontrada neste espaço.");
        await assertMonthOpen(tx, workspaceId, actorId, activity.startTime);
        await tx.activity.delete({ where: { id: activity.id } });
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }
}
