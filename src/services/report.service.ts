import { DateTime } from "luxon";
import { ReportQueryInput } from "@/schemas/report.schema";
import prisma from "@/lib/prisma";
import { dateOnlyEnd, dateOnlyStart, formatDateOnly } from "@/lib/date-only";
import { TIMEZONE } from "@/lib/constants";
import { TimesheetStatus } from "../../generated/prisma/enums";

export type ReportRow = {
  id: string;
  date: string;
  dayType: string;
  status: TimesheetStatus;
  totalWorkedMinutes: number;
  normalMinutes: number;
  overtime75FhcMinutes: number;
  overtime75FhcnMinutes: number;
  overtime100FhcMinutes: number;
  overtime100FhcnMinutes: number;
  activityMinutes: number;
  activityCount: number;
  absenceType: string | null;
  absenceDays: number;
};

export type ReportSummary = {
  totalWorkedMinutes: number;
  normalMinutes: number;
  overtime75FhcMinutes: number;
  overtime75FhcnMinutes: number;
  overtime100FhcMinutes: number;
  overtime100FhcnMinutes: number;
  activityMinutes: number;
  absenceDays: number;
};

export type ReportResult = {
  rows: ReportRow[];
  summary: ReportSummary;
  period: {
    startDate: string;
    endDate: string;
  };
};

export type TeamReportRow = {
  userId: string;
  name: string;
  email: string;
  totalWorkedMinutes: number;
  normalMinutes: number;
  overtime75Minutes: number;
  overtime100Minutes: number;
  activityMinutes: number;
  activityCount: number;
  daysWithRecords: number;
  absenceDays: number;
};

type GetReportDataParams = ReportQueryInput & {
  userId: string;
  workspaceId: string;
};

function parseStartDateToDate(value: string) {
  return dateOnlyStart(value);
}

function parseEndDateToDate(value: string) {
  return dateOnlyEnd(value);
}

function formatDateToReportValue(date: Date) {
  return formatDateOnly(date);
}

function activityDateKey(date: Date) {
  return DateTime.fromJSDate(date, { zone: TIMEZONE }).toFormat("yyyy-MM-dd");
}

function eachDate(
  startDate: string,
  endDate: string,
  callback: (date: string) => void,
) {
  let cursor = DateTime.fromISO(startDate, { zone: "UTC" });
  const end = DateTime.fromISO(endDate, { zone: "UTC" });
  while (cursor <= end) {
    callback(cursor.toFormat("yyyy-MM-dd"));
    cursor = cursor.plus({ days: 1 });
  }
}

function localDateRange(startDate: string, endDate: string) {
  return {
    gte: DateTime.fromISO(startDate, { zone: TIMEZONE }).startOf("day").toJSDate(),
    lt: DateTime.fromISO(endDate, { zone: TIMEZONE })
      .plus({ days: 1 })
      .startOf("day")
      .toJSDate(),
  };
}

const absenceLabels: Record<string, string> = {
  MEDICAL_LEAVE: "Afastamento médico",
  VACATION: "Férias",
  COMPENSATORY_OFF: "Folga compensatória",
  DAY_OFF: "Folga",
  JUSTIFIED_ABSENCE: "Ausência justificada",
  UNJUSTIFIED_ABSENCE: "Ausência não justificada",
  BEREAVEMENT: "Licença luto",
  MATERNITY: "Licença maternidade",
  PATERNITY: "Licença paternidade",
  OTHER: "Outra ausência",
};

function getAbsenceLabel(type: string) {
  return absenceLabels[type] ?? "Ausência";
}

function getDayTypeLabel(isHoliday: boolean, isWeekend: boolean) {
  if (isHoliday) return "Feriado";
  if (isWeekend) return "Fim de semana";
  return "Dia útil";
}

function createEmptySummary(): ReportSummary {
  return {
    totalWorkedMinutes: 0,
    normalMinutes: 0,
    overtime75FhcMinutes: 0,
    overtime75FhcnMinutes: 0,
    overtime100FhcMinutes: 0,
    overtime100FhcnMinutes: 0,
    activityMinutes: 0,
    absenceDays: 0,
  };
}

function buildSummary(rows: ReportRow[]): ReportSummary {
  return rows.reduce<ReportSummary>((acc, row) => {
    acc.totalWorkedMinutes += row.totalWorkedMinutes;
    acc.normalMinutes += row.normalMinutes;
    acc.overtime75FhcMinutes += row.overtime75FhcMinutes;
    acc.overtime75FhcnMinutes += row.overtime75FhcnMinutes;
    acc.overtime100FhcMinutes += row.overtime100FhcMinutes;
    acc.overtime100FhcnMinutes += row.overtime100FhcnMinutes;
    acc.activityMinutes += row.activityMinutes;
    acc.absenceDays = (acc.absenceDays ?? 0) + row.absenceDays;

    return acc;
  }, createEmptySummary());
}

function emptyTeamRow(user: {
  id: string;
  name: string;
  email: string;
}): TeamReportRow {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    totalWorkedMinutes: 0,
    normalMinutes: 0,
    overtime75Minutes: 0,
    overtime100Minutes: 0,
    activityMinutes: 0,
    activityCount: 0,
    daysWithRecords: 0,
    absenceDays: 0,
  };
}

export async function getReportData({
  userId,
  workspaceId,
  startDate,
  endDate,
}: GetReportDataParams): Promise<ReportResult> {
  const start = parseStartDateToDate(startDate);
  const end = parseEndDateToDate(endDate);

  const [timeSheets, activities, absences, holidays] = await Promise.all([
    prisma.timesheet.findMany({
      where: {
        userId,
        workspaceId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: "asc",
      },
      select: {
        id: true,
        date: true,
        status: true,
        isHoliday: true,
        isWeekend: true,
        totalWorkedMinutes: true,
        normalMinutes: true,
        overtime75FhcMinutes: true,
        overtime75FhcnMinutes: true,
        overtime100FhcMinutes: true,
        overtime100FhcnMinutes: true,
      },
    }),
    prisma.activity.findMany({
      where: { userId, workspaceId, startTime: localDateRange(startDate, endDate) },
      select: { startTime: true, durationMinutes: true },
    }),
    prisma.absences.findMany({
      where: {
        userId,
        workspaceId,
        status: "APPROVED",
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { startDate: true, endDate: true, type: true },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true },
    }),
  ]);

  const activityByDate = new Map<string, { minutes: number; count: number }>();
  for (const activity of activities) {
    const key = activityDateKey(activity.startTime);
    const current = activityByDate.get(key) ?? { minutes: 0, count: 0 };
    current.minutes += activity.durationMinutes;
    current.count += 1;
    activityByDate.set(key, current);
  }

  const absenceByDate = new Map<string, string>();
  for (const absence of absences) {
    const absenceStart = formatDateOnly(absence.startDate);
    const absenceEnd = formatDateOnly(absence.endDate);
    const from = absenceStart < startDate ? startDate : absenceStart;
    const to = absenceEnd > endDate ? endDate : absenceEnd;
    eachDate(from, to, (key) => {
      const previous = absenceByDate.get(key);
      const label = getAbsenceLabel(absence.type);
      absenceByDate.set(
        key,
        previous && previous !== label ? `${previous}, ${label}` : label,
      );
    });
  }

  const holidayKeys = new Set(holidays.map((holiday) => formatDateOnly(holiday.date)));
  const rowsByDate = new Map<string, ReportRow>();
  for (const timeSheet of timeSheets) {
    const date = formatDateToReportValue(timeSheet.date);
    const activity = activityByDate.get(date) ?? { minutes: 0, count: 0 };
    const absenceType = absenceByDate.get(date) ?? null;
    rowsByDate.set(date, {
      id: timeSheet.id,
      date,
      dayType: absenceType
        ? `Ausência · ${absenceType}`
        : getDayTypeLabel(timeSheet.isHoliday, timeSheet.isWeekend),
      status: timeSheet.status,
      totalWorkedMinutes: timeSheet.totalWorkedMinutes,
      normalMinutes: timeSheet.normalMinutes,
      overtime75FhcMinutes: timeSheet.overtime75FhcMinutes,
      overtime75FhcnMinutes: timeSheet.overtime75FhcnMinutes,
      overtime100FhcMinutes: timeSheet.overtime100FhcMinutes,
      overtime100FhcnMinutes: timeSheet.overtime100FhcnMinutes,
      activityMinutes: activity.minutes,
      activityCount: activity.count,
      absenceType,
      absenceDays: absenceType ? 1 : 0,
    });
  }

  for (const key of new Set([...activityByDate.keys(), ...absenceByDate.keys()])) {
    if (rowsByDate.has(key)) continue;
    const date = DateTime.fromISO(key, { zone: "UTC" });
    const activity = activityByDate.get(key) ?? { minutes: 0, count: 0 };
    const absenceType = absenceByDate.get(key) ?? null;
    const isWeekend = date.weekday === 6 || date.weekday === 7;
    rowsByDate.set(key, {
      id: `activity-${key}`,
      date: key,
      dayType: absenceType
        ? `Ausência · ${absenceType}`
        : getDayTypeLabel(holidayKeys.has(key), isWeekend),
      status: "OPEN",
      totalWorkedMinutes: 0,
      normalMinutes: 0,
      overtime75FhcMinutes: 0,
      overtime75FhcnMinutes: 0,
      overtime100FhcMinutes: 0,
      overtime100FhcnMinutes: 0,
      activityMinutes: activity.minutes,
      activityCount: activity.count,
      absenceType,
      absenceDays: absenceType ? 1 : 0,
    });
  }

  const rows = [...rowsByDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  const summary = buildSummary(rows);

  return {
    rows,
    summary,
    period: {
      startDate,
      endDate,
    },
  };
}

export async function getTeamReportData({
  workspaceId,
  userIds,
  startDate,
  endDate,
}: {
  workspaceId: string;
  userIds: string[];
  startDate: string;
  endDate: string;
}) {
  const start = parseStartDateToDate(startDate);
  const end = parseEndDateToDate(endDate);
  const uniqueUserIds = [...new Set(userIds)];
  const [users, sheets, activities, absences] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.timesheet.findMany({
      where: {
        workspaceId,
        userId: { in: uniqueUserIds },
        date: { gte: start, lte: end },
      },
      orderBy: [{ user: { name: "asc" } }, { date: "asc" }],
      select: {
        userId: true,
        date: true,
        totalWorkedMinutes: true,
        normalMinutes: true,
        overtime75FhcMinutes: true,
        overtime75FhcnMinutes: true,
        overtime100FhcMinutes: true,
        overtime100FhcnMinutes: true,
      },
    }),
    prisma.activity.findMany({
      where: {
        workspaceId,
        userId: { in: uniqueUserIds },
        startTime: localDateRange(startDate, endDate),
      },
      select: { userId: true, startTime: true, durationMinutes: true },
    }),
    prisma.absences.findMany({
      where: {
        workspaceId,
        userId: { in: uniqueUserIds },
        status: "APPROVED",
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { userId: true, startDate: true, endDate: true },
    }),
  ]);

  const rows = new Map<string, TeamReportRow>(
    users.map((user) => [user.id, emptyTeamRow(user)]),
  );
  const recordDates = new Map<string, Set<string>>(
    users.map((user) => [user.id, new Set<string>()]),
  );
  const absenceDates = new Map<string, Set<string>>(
    users.map((user) => [user.id, new Set<string>()]),
  );
  for (const sheet of sheets) {
    const current = rows.get(sheet.userId);
    if (!current) continue;
    recordDates.get(sheet.userId)?.add(formatDateOnly(sheet.date));
    current.totalWorkedMinutes += sheet.totalWorkedMinutes;
    current.normalMinutes += sheet.normalMinutes;
    current.overtime75Minutes +=
      sheet.overtime75FhcMinutes + sheet.overtime75FhcnMinutes;
    current.overtime100Minutes +=
      sheet.overtime100FhcMinutes + sheet.overtime100FhcnMinutes;
  }

  for (const activity of activities) {
    const current = rows.get(activity.userId);
    if (!current) continue;
    const date = activityDateKey(activity.startTime);
    current.activityMinutes += activity.durationMinutes;
    current.activityCount += 1;
    recordDates.get(activity.userId)?.add(date);
  }

  for (const absence of absences) {
    const fromKey =
      formatDateOnly(absence.startDate) < startDate
        ? startDate
        : formatDateOnly(absence.startDate);
    const toKey =
      formatDateOnly(absence.endDate) > endDate
        ? endDate
        : formatDateOnly(absence.endDate);
    eachDate(fromKey, toKey, (date) => {
      recordDates.get(absence.userId)?.add(date);
      absenceDates.get(absence.userId)?.add(date);
    });
  }

  for (const [userId, row] of rows) {
    row.daysWithRecords = recordDates.get(userId)?.size ?? 0;
    row.absenceDays = absenceDates.get(userId)?.size ?? 0;
  }

  return {
    rows: [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    period: { startDate, endDate },
  };
}
