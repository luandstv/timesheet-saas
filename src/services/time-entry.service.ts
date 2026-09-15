import { DateTime } from "luxon";
import prisma from "@/lib/prisma";
import { TIMEZONE } from "@/lib/constants";
import { dateOnlyStart } from "@/lib/date-only";

export class TimeEntryService {
  //Buscar ou criar TimeSheet do dia para o user
  static async getOrCreateTimeSheet(userId: string, date?: DateTime) {
    const targetDate = date || DateTime.now().setZone(TIMEZONE);
    const dateOnly = dateOnlyStart(targetDate);

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

  static async getClockState(userId: string) {
    // O estado do ponto pertence ao usuário: a troca da data não encerra uma
    // entrada pendente nem autoriza criar outra entrada no timesheet de hoje.
    const lastEntry = await prisma.timeEntry.findFirst({
      where: { timesheet: { userId } },
      orderBy: [
        { timestamp: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      include: { timesheet: true },
    });

    return {
      lastEntry,
      nextEntryType:
        lastEntry?.type === "CLOCK_IN"
          ? ("CLOCK_OUT" as const)
          : ("CLOCK_IN" as const),
    };
  }

  static async clockIn(userId: string) {
    const now = DateTime.now().setZone(TIMEZONE);

    const { lastEntry, nextEntryType: type } = await this.getClockState(userId);

    // Mantém o par na jornada em que a entrada foi registrada, inclusive após
    // meia-noite. Só abre o timesheet de hoje quando não há entrada pendente.
    const timeSheet =
      lastEntry?.type === "CLOCK_IN"
        ? lastEntry.timesheet
        : await this.getOrCreateTimeSheet(userId, now);

    if (timeSheet.status !== "OPEN") {
      throw new Error(
        "Esta jornada está bloqueada para novos registros. Solicite um ajuste antes de continuar.",
      );
    }

    const entry = await prisma.timeEntry.create({
      data: {
        timeSheetId: timeSheet.id,
        type,
        timestamp: now.toJSDate(),
        entryMode: "REGULAR",
      },
    });

    if (type === "CLOCK_OUT") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          dailyHours: true,
          workStartHour: true,
          workStartMinute: true,
          workEndHour: true,
          workEndMinute: true,
        },
      });

      if (user) {
        const { TimeCalculationService } =
          await import("./time-calculation.service");
        await TimeCalculationService.calculateAndUpdateTimeSheet(
          timeSheet.id,
          user.dailyHours,
          {
            startHour: user.workStartHour,
            startMinute: user.workStartMinute,
            endHour: user.workEndHour,
            endMinute: user.workEndMinute,
          },
        );
      }
    }

    return { entry, type, timeSheet };
  }

  static async getTodayEntries(userId: string) {
    const today = dateOnlyStart(DateTime.now().setZone(TIMEZONE));

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

  static async getTodayMovements(userId: string) {
    const start = DateTime.now().setZone(TIMEZONE).startOf("day");

    // Um movimento de hoje pode encerrar a jornada de ontem. O histórico usa
    // o instante real do registro, enquanto a apuração usa a data da jornada.
    return prisma.timeEntry.findMany({
      where: {
        timesheet: { userId },
        timestamp: {
          gte: start.toJSDate(),
          lt: start.plus({ days: 1 }).toJSDate(),
        },
      },
      orderBy: [
        { timestamp: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });
  }
}
