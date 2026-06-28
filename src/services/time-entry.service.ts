import { DateTime } from "luxon";
import prisma from "@/lib/prisma";
import { TIMEZONE } from "@/lib/constants";

export class TimeEntryService {
  //Buscar ou criar TimeSheet do dia para o user
  static async getOrCreateTimeSheet(userId: string, date?: DateTime) {
    const targetDate = date || DateTime.now().setZone(TIMEZONE);
    const dateOnly = targetDate.startOf("day").toJSDate();

    const isWeekend = targetDate.weekday === 6 || targetDate.weekday === 7;

    const holiday = await prisma.holiday.findFirst({
      where: { date: dateOnly },
    });

    const timeSheet = await prisma.timesheet.upsert({
      where: {
        userId_date: {
          userId,
          date: dateOnly,
        },
      },
      update: {},
      create: {
        userId,
        date: dateOnly,
        isWeekend,
        isHoliday: !!holiday,
      },
    });

    return timeSheet;
  }

  static async getNextEntryType(timeSheetId: string) {
    const lastEntry = await prisma.timeEntry.findFirst({
      where: { timeSheetId },
      orderBy: { timestamp: "desc" },
    });

    if (!lastEntry || lastEntry.type === "CLOCK_OUT") {
      return "CLOCK_IN" as const;
    }

    return "CLOCK_OUT" as const;
  }

  static async clockIn(userId: string) {
    const now = DateTime.now().setZone(TIMEZONE);

    const timeSheet = await this.getOrCreateTimeSheet(userId, now);

    const type = await this.getNextEntryType(timeSheet.id);

    const entry = await prisma.timeEntry.create({
      data: {
        timeSheetId: timeSheet.id,
        type,
        timestamp: now.toJSDate(),
        entryMode: "REGULAR",
      },
    });

    return { entry, type, timeSheet };
  }

  static async getTodayEntries(userId: string) {
    const today = DateTime.now().setZone(TIMEZONE).startOf("day").toJSDate();

    const timeSheet = await prisma.timesheet.findUnique({
      where: {
        userId_date: {
          userId,
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
}
