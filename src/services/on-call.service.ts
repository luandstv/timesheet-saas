import { DateTime } from "luxon";

import prisma from "@/lib/prisma";
import { dateOnlyEnd, dateOnlyStart, formatDateOnly } from "@/lib/date-only";
import { TIMEZONE } from "@/lib/constants";
import { describeOnCallDay, type OnCallHolidayMode } from "@/lib/on-call";
import { requireMember } from "./workspace.service";

export type OnCallDay = {
  id: string;
  date: string;
  holidayMode: OnCallHolidayMode;
  isWeekend: boolean;
  isHoliday: boolean;
  totalOnCallMinutes: number;
};

function parseDate(value: string) {
  const date = DateTime.fromISO(value, { zone: TIMEZONE });
  if (!date.isValid || date.toFormat("yyyy-MM-dd") !== value) {
    throw new Error("Escolha uma data válida.");
  }
  return date.startOf("day");
}

export class OnCallService {
  static async listMonth(userId: string, workspaceId: string, monthKey: string) {
    const month = DateTime.fromISO(`${monthKey}-01`, { zone: TIMEZONE });
    if (!month.isValid || month.toFormat("yyyy-MM") !== monthKey) {
      throw new Error("Mês inválido.");
    }

    const start = dateOnlyStart(month);
    const end = dateOnlyEnd(month.endOf("month"));
    const [days, holidays] = await Promise.all([
      prisma.onCallSchedule.findMany({
        where: { userId, workspaceId, date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: start, lte: end } },
        select: { date: true },
      }),
    ]);
    const holidayDates = new Set(
      holidays.map((holiday) => formatDateOnly(holiday.date)),
    );

    return days.map((day) => {
      // DATE columns represent a civil day. Keep UTC here instead of shifting
      // midnight into the previous day in America/Sao_Paulo.
      const date = DateTime.fromJSDate(day.date, { zone: "UTC" });
      return {
        id: day.id,
        date: formatDateOnly(day.date),
        ...describeOnCallDay(date, day.holidayOverride, holidayDates),
        totalOnCallMinutes: day.totalOnCallMinutes,
      };
    });
  }

  static async saveDay(
    actorId: string,
    workspaceId: string,
    input: { date: string; holidayMode: OnCallHolidayMode },
  ) {
    const date = parseDate(input.date);
    await requireMember(prisma, workspaceId, actorId, true);
    const holiday = await prisma.holiday.findUnique({
      where: { date: dateOnlyStart(date) },
    });
    const holidayOverride =
      input.holidayMode === "auto" ? null : input.holidayMode === "holiday";
    const details = describeOnCallDay(
      date,
      holidayOverride,
      new Set(holiday ? [input.date] : []),
    );

    return prisma.onCallSchedule.upsert({
      where: {
        workspaceId_userId_date: {
          workspaceId,
          userId: actorId,
          date: dateOnlyStart(date),
        },
      },
      create: {
        workspaceId,
        userId: actorId,
        date: dateOnlyStart(date),
        totalOnCallMinutes: details.totalOnCallMinutes,
        holidayOverride,
      },
      update: {
        totalOnCallMinutes: details.totalOnCallMinutes,
        holidayOverride,
      },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  static async removeDay(actorId: string, workspaceId: string, dateValue: string) {
    const date = parseDate(dateValue);
    await requireMember(prisma, workspaceId, actorId, true);
    await prisma.onCallSchedule.deleteMany({
      where: { workspaceId, userId: actorId, date: dateOnlyStart(date) },
    });
  }
}
