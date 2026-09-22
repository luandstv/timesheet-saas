import { DateTime } from "luxon";
import prisma from "@/lib/prisma";
import {
  DEFAULT_WORK_END_HOUR,
  DEFAULT_WORK_START_HOUR,
  TIMEZONE,
} from "@/lib/constants";
import { dateOnlyStart } from "@/lib/date-only";
import { classifyEntryMode } from "@/lib/entry-mode";
import type { Prisma } from "../../generated/prisma/client";

import { requireMember, lockWorkspace, lockPerson } from "./workspace.service";
import { loadEffectiveUser, assertMonthOpen } from "./effective-time.service";
import { HoursBudgetService } from "./hours-budget.service";
type TimeEntryDatabase = Prisma.TransactionClient;

export class TimeEntryService {
  //Buscar ou criar TimeSheet do dia para o user
  static async getOrCreateTimeSheet(
    userId: string,
    date?: DateTime,
    db: TimeEntryDatabase = prisma,
    workspaceId: string = userId,
  ) {
    const targetDate = date || DateTime.now().setZone(TIMEZONE);
    const dateOnly = dateOnlyStart(targetDate);

    const isWeekend = targetDate.weekday === 6 || targetDate.weekday === 7;

    const holiday = await db.holiday.findFirst({
      where: { date: dateOnly },
    });

    const timeSheet = await db.timesheet.upsert({
      where: {
        userId_workspaceId_date: {
          userId,
          workspaceId,
          date: dateOnly,
        },
      },
      update: {},
      create: {
        userId,
        workspaceId,
        date: dateOnly,
        isWeekend,
        isHoliday: !!holiday,
      },
    });

    return timeSheet;
  }

  static async getClockState(userId: string, db: TimeEntryDatabase = prisma) {
    const entries = await loadEffectiveUser(userId, db);
    const lastEntry = entries.at(-1) ?? null;

    return {
      lastEntry,
      nextEntryType:
        lastEntry?.type === "CLOCK_IN" ? ("CLOCK_OUT" as const) : ("CLOCK_IN" as const),
    };
  }

  static async clockIn(
    userId: string,
    requestId?: string,
    workspaceId: string = userId,
  ) {
    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        await requireMember(tx, workspaceId, userId, true);
        // Serializa o estado do ponto por usuário. Assim, duas requisições
        // diferentes não podem ler o mesmo último movimento e criar duas entradas.
        await lockPerson(tx, userId);

        if (requestId) {
          const existing = await tx.timeEntry.findFirst({
            where: { requestId, timesheet: { userId, workspaceId } },
            include: { timesheet: true },
          });

          if (existing) {
            return {
              entry: existing,
              type: existing.type,
              timeSheet: existing.timesheet,
            };
          }
        }

        const now = DateTime.now().setZone(TIMEZONE);
        const { lastEntry, nextEntryType: type } = await this.getClockState(userId, tx);

        if (
          lastEntry?.type === "CLOCK_IN" &&
          lastEntry.timesheet.workspaceId !== workspaceId
        ) {
          throw new Error(
            "Você tem um ponto aberto em outro espaço. Troque para esse espaço para encerrá-lo.",
          );
        }
        // Mantém o par na jornada em que a entrada foi registrada, inclusive após
        // meia-noite. Só abre o timesheet de hoje quando não há entrada pendente.
        const timeSheet =
          lastEntry?.type === "CLOCK_IN"
            ? lastEntry.timesheet
            : await this.getOrCreateTimeSheet(userId, now, tx, workspaceId);

        await assertMonthOpen(tx, workspaceId, userId, timeSheet.date);

        if (timeSheet.status !== "OPEN") {
          throw new Error(
            "Esta jornada está bloqueada para novos registros. Solicite um ajuste antes de continuar.",
          );
        }

        const user =
          typeof tx.user?.findUnique === "function"
            ? await tx.user.findUnique({
                where: { id: userId },
                select: {
                  dailyHours: true,
                  workStartHour: true,
                  workStartMinute: true,
                  workEndHour: true,
                  workEndMinute: true,
                },
              })
            : null;
        const onCallSchedule =
          typeof tx.onCallSchedule?.findUnique === "function"
            ? await tx.onCallSchedule.findUnique({
                where: {
                  workspaceId_userId_date: {
                    workspaceId,
                    userId,
                    date: timeSheet.date,
                  },
                },
                select: { id: true },
              })
            : null;
        const effectiveUser = user ?? {
          dailyHours: 8,
          workStartHour: DEFAULT_WORK_START_HOUR,
          workStartMinute: 0,
          workEndHour: DEFAULT_WORK_END_HOUR,
          workEndMinute: 0,
        };
        const entryMode = classifyEntryMode(now.toJSDate(), Boolean(onCallSchedule), {
          startHour: effectiveUser.workStartHour,
          startMinute: effectiveUser.workStartMinute,
          endHour: effectiveUser.workEndHour,
          endMinute: effectiveUser.workEndMinute,
        });

        const entry = await tx.timeEntry.create({
          data: {
            timeSheetId: timeSheet.id,
            type,
            timestamp: now.toJSDate(),
            entryMode,
            requestId,
          },
        });

        if (type === "CLOCK_OUT") {
          const { TimeCalculationService } = await import("./time-calculation.service");
          await TimeCalculationService.calculateAndUpdateTimeSheet(
            timeSheet.id,
            effectiveUser.dailyHours,
            {
              startHour: effectiveUser.workStartHour,
              startMinute: effectiveUser.workStartMinute,
              endHour: effectiveUser.workEndHour,
              endMinute: effectiveUser.workEndMinute,
            },
            tx,
          );
          await HoursBudgetService.refreshAlerts(
            tx,
            workspaceId,
            userId,
            timeSheet.date,
          );
        }

        return { entry, type, timeSheet };
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async getTodayEntries(userId: string, workspaceId: string = userId) {
    const today = dateOnlyStart(DateTime.now().setZone(TIMEZONE));

    const timeSheet = await prisma.timesheet.findUnique({
      where: {
        userId_workspaceId_date: {
          userId,
          workspaceId,
          date: today,
        },
      },
      include: {
        entries: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    return timeSheet;
  }

  static async getTodayMovements(userId: string, workspaceId: string = userId) {
    const start = DateTime.now().setZone(TIMEZONE).startOf("day");
    const entries = await loadEffectiveUser(userId);
    return entries
      .filter(
        (entry) =>
          entry.timesheet.workspaceId === workspaceId &&
          +entry.timestamp >= +start &&
          +entry.timestamp < +start.plus({ days: 1 }),
      )
      .reverse();
  }
}
