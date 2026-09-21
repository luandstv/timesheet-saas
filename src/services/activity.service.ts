import { DateTime } from "luxon";

import prisma from "@/lib/prisma";
import { FHCN_END_HOUR, FHCN_START_HOUR, TIMEZONE } from "@/lib/constants";

import { assertMonthOpen } from "./effective-time.service";
import { requireMember } from "./workspace.service";
import { TimeEntryService } from "./time-entry.service";

export type ActivityInput = {
  description: string;
  incidentCode?: string | null;
  activityDate: string;
  startTime?: string | null;
  endTime?: string | null;
};

function parseActivityDate(value: string) {
  const parsed = DateTime.fromFormat(value, "yyyy-MM-dd", { zone: TIMEZONE });
  if (!parsed.isValid || parsed.toFormat("yyyy-MM-dd") !== value) {
    throw new Error("Informe uma data válida para a atividade.");
  }
  return parsed.startOf("day");
}

function parseActivityTime(date: DateTime, value: string, label: string) {
  const parsed = DateTime.fromFormat(
    `${date.toFormat("yyyy-MM-dd")}T${value}`,
    "yyyy-MM-dd'T'HH:mm",
    { zone: TIMEZONE },
  );
  if (!parsed.isValid) throw new Error(`Informe um horário válido para ${label}.`);
  return parsed;
}

function periodFor(date: DateTime): "FHC" | "FHCN" {
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

  const activityDate = parseActivityDate(input.activityDate);
  const startValue = input.startTime?.trim() || null;
  const endValue = input.endTime?.trim() || null;
  if ((startValue && !endValue) || (!startValue && endValue)) {
    throw new Error("Informe início e fim ou deixe os dois horários em branco.");
  }

  const now = DateTime.now().setZone(TIMEZONE);
  if (activityDate > now.startOf("day")) {
    throw new Error("A atividade não pode estar no futuro.");
  }

  if (!startValue && !endValue) {
    return {
      description,
      incidentCode,
      activityDate,
      start: activityDate,
      end: null,
      durationMinutes: 0,
      period: null,
    };
  }

  const start = parseActivityTime(activityDate, startValue!, "o início");
  const end = parseActivityTime(activityDate, endValue!, "o fim");
  if (start > now || end > now)
    throw new Error("A atividade não pode estar no futuro.");
  if (end <= start) throw new Error("O fim da atividade deve ser posterior ao início.");

  return {
    description,
    incidentCode,
    activityDate,
    start,
    end,
    durationMinutes: durationInMinutes(start, end),
    period: periodFor(start),
  };
}

export class ActivityService {
  static async create(actorId: string, workspaceId: string, input: ActivityInput) {
    const validated = validateInput(input);

    return prisma.$transaction(
      async (tx) => {
        await requireMember(tx, workspaceId, actorId, true);
        await assertMonthOpen(
          tx,
          workspaceId,
          actorId,
          validated.activityDate.toJSDate(),
        );

        let timeSheetId: string | null = null;
        if (validated.end) {
          const timeSheet = await TimeEntryService.getOrCreateTimeSheet(
            actorId,
            validated.start,
            tx,
            workspaceId,
          );
          if (timeSheet.status !== "OPEN") {
            throw new Error("Esta jornada está fechada para novos acionamentos.");
          }
          timeSheetId = timeSheet.id;
        }

        return tx.activity.create({
          data: {
            user: { connect: { id: actorId } },
            workspace: { connect: { id: workspaceId } },
            timesheet: timeSheetId ? { connect: { id: timeSheetId } } : undefined,
            description: validated.description,
            incidentCode: validated.incidentCode,
            startTime: validated.start.toJSDate(),
            endTime: validated.end?.toJSDate() ?? null,
            durationMinutes: validated.durationMinutes,
            period: validated.period,
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
      orderBy: { createdAt: "desc" },
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
