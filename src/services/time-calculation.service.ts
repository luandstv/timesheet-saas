import {
  FHC_START_HOUR,
  FHC_START_MINUTE,
  FHCN_END_HOUR,
  FHCN_START_HOUR,
  MAX_OVERTIME_75_MINUTES_WEEKDAY,
  TIMEZONE,
} from "@/lib/constants";
import { DateTime } from "luxon";

interface TimeEntryForCalc {
  type: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: Date;
}

interface DayCalculation {
  totalWorkedMinutes: number;
  normalMinutes: number;
  overtime75FhcMinutes: number;
  overtime75FhcnMinutes: number;
  overtime100FhcMinutes: number;
  overtime100FhcnMinutes: number;
}

type PeriodType = "NORMAL" | "FHC" | "FHCN";

interface Segment {
  minutes: number;
  period: PeriodType;
}

interface WorkSchedule {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export class TimeCalculationService {
  static formPairs(
    entries: TimeEntryForCalc[],
  ): { start: DateTime; end: DateTime }[] {
    const pairs: { start: DateTime; end: DateTime }[] = [];

    const sorted = [...entries].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (current.type === "CLOCK_IN" && next?.type === "CLOCK_OUT") {
        pairs.push({
          start: DateTime.fromJSDate(current.timestamp).setZone(TIMEZONE),
          end: DateTime.fromJSDate(next.timestamp).setZone(TIMEZONE),
        });
        i++; // pular o CLOCK_OUT correspondente pois ja foi consumido
      }
    }

    return pairs;
  }

  static getPeriodType(dt: DateTime, schedule: WorkSchedule): PeriodType {
    const hour = dt.hour;
    const minute = dt.minute;

    if (hour >= FHCN_START_HOUR || hour < FHCN_END_HOUR) {
      return "FHCN";
    }

    if (hour === FHCN_END_HOUR && minute === 0) {
      return "FHCN";
    }

    const afterStart =
      hour > schedule.startHour ||
      (hour === schedule.startHour && minute >= schedule.startMinute);

    const beforeEnd =
      hour < schedule.endHour ||
      (hour === schedule.endHour && minute < schedule.endMinute);

    if (afterStart && beforeEnd) {
      return "NORMAL";
    }

    return "FHC";
  }

  static getNextBoundary(dt: DateTime, schedule: WorkSchedule): DateTime {
    const hour = dt.hour;
    const minute = dt.minute;

    const boundaries = [
      { hour: FHC_START_HOUR, minute: FHC_START_MINUTE },
      { hour: schedule.startHour, minute: schedule.startMinute },
      { hour: schedule.endHour, minute: schedule.endMinute },
      { hour: FHCN_START_HOUR, minute: 0 },
    ];

    for (const b of boundaries) {
      if (hour < b.hour || (hour === b.hour && minute < b.minute)) {
        return dt.set({
          hour: b.hour,
          minute: b.minute,
          second: 0,
          millisecond: 0,
        });
      }
    }

    return dt.plus({ days: 1 }).set({
      hour: FHC_START_HOUR,
      minute: FHC_START_MINUTE,
      second: 0,
      millisecond: 0,
    });
  }

  static generateSegments(
    start: DateTime,
    end: DateTime,
    schedule: WorkSchedule,
  ): Segment[] {
    const segments: Segment[] = [];
    let current = start;

    while (current < end) {
      const nextBoundary = this.getNextBoundary(current, schedule);
      const segmentEnd = nextBoundary < end ? nextBoundary : end;
      const minutes = Math.round(segmentEnd.diff(current, "minutes").minutes);

      if (minutes > 0) {
        segments.push({
          minutes,
          period: this.getPeriodType(current, schedule),
        });
      }

      current = segmentEnd;
    }

    return segments;
  }

  static calculateDay(
    entries: TimeEntryForCalc[],
    dailyHours: number,
    isWeekend: boolean,
    isHoliday: boolean,
    schedule: WorkSchedule,
  ): DayCalculation {
    const pairs = this.formPairs(entries);

    const allSegments: Segment[] = [];
    for (const pair of pairs) {
      const segments = this.generateSegments(pair.start, pair.end, schedule);
      allSegments.push(...segments);
    }

    const totalWorkedMinutes = allSegments.reduce(
      (sum, s) => sum + s.minutes,
      0,
    );

    if (isWeekend || isHoliday) {
      const fhcMinutes = allSegments
        .filter((s) => s.period === "NORMAL" || s.period === "FHC")
        .reduce((sum, s) => sum + s.minutes, 0);
      const fhcnMinutes = allSegments
        .filter((s) => s.period === "FHCN")
        .reduce((sum, s) => sum + s.minutes, 0);

      return {
        totalWorkedMinutes,
        normalMinutes: 0,
        overtime75FhcMinutes: 0,
        overtime75FhcnMinutes: 0,
        overtime100FhcMinutes: fhcMinutes,
        overtime100FhcnMinutes: fhcnMinutes,
      };
    }

    const dailyMinutes = dailyHours * 60;
    const maxOvertime75minutes = MAX_OVERTIME_75_MINUTES_WEEKDAY;

    let normalMinutes = 0;
    let overtime75FhcMinutes = 0;
    let overtime75FhcnMinutes = 0;
    let overtime100FhcMinutes = 0;
    let overtime100FhcnMinutes = 0;

    let normalUsed = 0;
    let overtime75Used = 0;

    for (const segment of allSegments) {
      let remaining = segment.minutes;

      if (segment.period === "NORMAL") {
        if (normalUsed < dailyMinutes) {
          const canUseAsNormal = Math.min(remaining, dailyMinutes - normalUsed);
          normalMinutes += canUseAsNormal;
          normalUsed += canUseAsNormal;
          remaining -= canUseAsNormal;
        }

        if (remaining > 0) {
          if (overtime75Used < maxOvertime75minutes) {
            const canUseAs75 = Math.min(
              remaining,
              maxOvertime75minutes - overtime75Used,
            );

            overtime75FhcMinutes += canUseAs75;
            overtime75Used += canUseAs75;
            remaining -= canUseAs75;
          }
          if (remaining > 0) {
            overtime100FhcMinutes += remaining;
          }
        }
      } else {
        const isFhcn = segment.period === "FHCN";

        if (overtime75Used < maxOvertime75minutes) {
          const canUseAs75 = Math.min(
            remaining,
            maxOvertime75minutes - overtime75Used,
          );

          if (isFhcn) {
            overtime75FhcnMinutes += canUseAs75;
          } else {
            overtime75FhcMinutes += canUseAs75;
          }

          overtime75Used += canUseAs75;
          remaining -= canUseAs75;
        }

        if (remaining > 0) {
          if (isFhcn) {
            overtime100FhcnMinutes += remaining;
          } else {
            overtime100FhcMinutes += remaining;
          }
        }
      }
    }

    return {
      totalWorkedMinutes,
      normalMinutes,
      overtime75FhcMinutes,
      overtime75FhcnMinutes,
      overtime100FhcMinutes,
      overtime100FhcnMinutes,
    };
  }

  static async calculateAndUpdateTimeSheet(
    timesheetId: string,
    dailyHours: number,
    schedule: WorkSchedule,
  ) {
    const prisma = (await import("@/lib/prisma")).default;

    const timeSheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        entries: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!timeSheet) {
      return null;
    }

    const calculation = this.calculateDay(
      timeSheet.entries,
      dailyHours,
      timeSheet.isWeekend,
      timeSheet.isHoliday,
      schedule,
    );

    const updated = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        totalWorkedMinutes: calculation.totalWorkedMinutes,
        normalMinutes: calculation.normalMinutes,
        overtime75FhcMinutes: calculation.overtime75FhcMinutes,
        overtime75FhcnMinutes: calculation.overtime75FhcnMinutes,
        overtime100FhcMinutes: calculation.overtime100FhcMinutes,
        overtime100FhcnMinutes: calculation.overtime100FhcnMinutes,
      },
    });

    return updated;
  }
}
