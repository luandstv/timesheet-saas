import { DateTime } from "luxon";
import { TIMEZONE } from "@/lib/constants";
import { dateOnlyEnd, dateOnlyStart } from "@/lib/date-only";

function activityRange(start: DateTime | Date, end: DateTime | Date) {
  const startDate =
    start instanceof Date
      ? DateTime.fromJSDate(start, { zone: TIMEZONE })
      : start.setZone(TIMEZONE);
  const endDate =
    end instanceof Date
      ? DateTime.fromJSDate(end, { zone: TIMEZONE })
      : end.setZone(TIMEZONE);
  return {
    gte: startDate.startOf("day").toJSDate(),
    lt: endDate.plus({ days: 1 }).startOf("day").toJSDate(),
  };
}

function sumActivityMinutes(activities: { durationMinutes: number }[]) {
  return activities.reduce((sum, activity) => sum + activity.durationMinutes, 0);
}

function countAbsenceDays(
  absences: { startDate: Date; endDate: Date }[],
  start: DateTime,
  end: DateTime,
) {
  const first = start.toFormat("yyyy-MM-dd");
  const last = end.toFormat("yyyy-MM-dd");
  const dates = new Set<string>();
  for (const absence of absences) {
    let cursor = DateTime.fromJSDate(absence.startDate, { zone: "UTC" });
    const absenceEnd = DateTime.fromJSDate(absence.endDate, { zone: "UTC" });
    while (cursor <= absenceEnd) {
      const key = cursor.toFormat("yyyy-MM-dd");
      if (key >= first && key <= last) dates.add(key);
      cursor = cursor.plus({ days: 1 });
    }
  }
  return dates.size;
}

export class DashboardService {
  static async getTodaySummary(userId: string, workspaceId: string = userId) {
    const prisma = (await import("@/lib/prisma")).default;
    const todayLocal = DateTime.now().setZone(TIMEZONE).startOf("day");
    const today = dateOnlyStart(todayLocal);

    const [timeSheet, activities, absences] = await Promise.all([
      prisma.timesheet.findUnique({
        where: {
          userId_workspaceId_date: {
            userId,
            workspaceId,
            date: today,
          },
        },
      }),
      prisma.activity.findMany({
        where: {
          userId,
          workspaceId,
          startTime: activityRange(todayLocal, todayLocal),
        },
        select: { durationMinutes: true },
      }),
      prisma.absences.findMany({
        where: {
          userId,
          workspaceId,
          status: "APPROVED",
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { startDate: true, endDate: true },
      }),
    ]);

    return {
      totalWorkedMinutes: timeSheet?.totalWorkedMinutes ?? 0,
      normalMinutes: timeSheet?.normalMinutes ?? 0,
      overtime75FhcMinutes: timeSheet?.overtime75FhcMinutes ?? 0,
      overtime75FhcnMinutes: timeSheet?.overtime75FhcnMinutes ?? 0,
      overtime100FhcMinutes: timeSheet?.overtime100FhcMinutes ?? 0,
      overtime100FhcnMinutes: timeSheet?.overtime100FhcnMinutes ?? 0,
      activityMinutes: sumActivityMinutes(activities),
      absenceDays: absences.length > 0 ? 1 : 0,
    };
  }

  static async getWeekSummary(userId: string, workspaceId: string = userId) {
    const prisma = (await import("@/lib/prisma")).default;
    // Mantemos o mesmo intervalo usado pelo gráfico: domingo a sábado.
    const now = DateTime.now().setZone(TIMEZONE).setLocale("en-US");
    const startOfWeekLocal = now.startOf("week");
    const endOfWeekLocal = now.endOf("week");
    const startOfWeek = dateOnlyStart(startOfWeekLocal);
    const endOfWeek = dateOnlyEnd(endOfWeekLocal);

    const [timeSheets, activities, absences] = await Promise.all([
      prisma.timesheet.findMany({
        where: {
          userId,
          workspaceId,
          date: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
      }),
      prisma.activity.findMany({
        where: {
          userId,
          workspaceId,
          startTime: activityRange(startOfWeekLocal, endOfWeekLocal),
        },
        select: { durationMinutes: true },
      }),
      prisma.absences.findMany({
        where: {
          userId,
          workspaceId,
          status: "APPROVED",
          startDate: { lte: endOfWeek },
          endDate: { gte: startOfWeek },
        },
        select: { startDate: true, endDate: true },
      }),
    ]);

    return {
      totalWorkedMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.totalWorkedMinutes,
        0,
      ),
      normalMinutes: timeSheets.reduce((sum, ts) => sum + ts.normalMinutes, 0),
      overtime75FhcMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.overtime75FhcMinutes,
        0,
      ),
      overtime75FhcnMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.overtime75FhcnMinutes,
        0,
      ),
      overtime100FhcMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.overtime100FhcMinutes,
        0,
      ),
      overtime100FhcnMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.overtime100FhcnMinutes,
        0,
      ),
      activityMinutes: sumActivityMinutes(activities),
      absenceDays: countAbsenceDays(absences, startOfWeekLocal, endOfWeekLocal),
    };
  }

  static async getMonthSummary(userId: string, workspaceId: string = userId) {
    const prisma = (await import("@/lib/prisma")).default;
    const now = DateTime.now().setZone(TIMEZONE);
    const startOfMonthLocal = now.startOf("month");
    const endOfMonthLocal = now.endOf("month");
    const startOfMonth = dateOnlyStart(startOfMonthLocal);
    const endOfMonth = dateOnlyEnd(endOfMonthLocal);

    const [timeSheets, activities, absences] = await Promise.all([
      prisma.timesheet.findMany({
        where: {
          userId,
          workspaceId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      prisma.activity.findMany({
        where: {
          userId,
          workspaceId,
          startTime: activityRange(startOfMonthLocal, endOfMonthLocal),
        },
        select: { durationMinutes: true },
      }),
      prisma.absences.findMany({
        where: {
          userId,
          workspaceId,
          status: "APPROVED",
          startDate: { lte: endOfMonth },
          endDate: { gte: startOfMonth },
        },
        select: { startDate: true, endDate: true },
      }),
    ]);

    return {
      totalWorkedMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.totalWorkedMinutes,
        0,
      ),
      normalMinutes: timeSheets.reduce((sum, ts) => sum + ts.normalMinutes, 0),
      overtime75FhcMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.overtime75FhcMinutes,
        0,
      ),
      overtime75FhcnMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.overtime75FhcnMinutes,
        0,
      ),
      overtime100FhcMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.overtime100FhcMinutes,
        0,
      ),
      overtime100FhcnMinutes: timeSheets.reduce(
        (sum, ts) => sum + ts.overtime100FhcnMinutes,
        0,
      ),
      activityMinutes: sumActivityMinutes(activities),
      absenceDays: countAbsenceDays(absences, startOfMonthLocal, endOfMonthLocal),
    };
  }
}
