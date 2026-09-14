import { DateTime } from "luxon";
import { TIMEZONE } from "@/lib/constants";
import { dateOnlyEnd, dateOnlyStart } from "@/lib/date-only";

export class DashboardService {
  static async getTodaySummary(userId: string) {
    const prisma = (await import("@/lib/prisma")).default;
    const today = dateOnlyStart(DateTime.now().setZone(TIMEZONE));

    const timeSheet = await prisma.timesheet.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    return {
      totalWorkedMinutes: timeSheet?.totalWorkedMinutes ?? 0,
      normalMinutes: timeSheet?.normalMinutes ?? 0,
      overtime75FhcMinutes: timeSheet?.overtime75FhcMinutes ?? 0,
      overtime75FhcnMinutes: timeSheet?.overtime75FhcnMinutes ?? 0,
      overtime100FhcMinutes: timeSheet?.overtime100FhcMinutes ?? 0,
      overtime100FhcnMinutes: timeSheet?.overtime100FhcnMinutes ?? 0,
    };
  }

  static async getWeekSummary(userId: string) {
    const prisma = (await import("@/lib/prisma")).default;
    // Mantemos o mesmo intervalo usado pelo gráfico: domingo a sábado.
    const now = DateTime.now().setZone(TIMEZONE).setLocale("en-US");
    const startOfWeek = dateOnlyStart(now.startOf("week"));
    const endOfWeek = dateOnlyEnd(now.endOf("week"));

    const timeSheets = await prisma.timesheet.findMany({
      where: {
        userId,
        date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

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
    };
  }

  static async getMonthSummary(userId: string) {
    const prisma = (await import("@/lib/prisma")).default;
    const now = DateTime.now().setZone(TIMEZONE);
    const startOfMonth = dateOnlyStart(now.startOf("month"));
    const endOfMonth = dateOnlyEnd(now.endOf("month"));

    const timeSheets = await prisma.timesheet.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

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
    };
  }
}
