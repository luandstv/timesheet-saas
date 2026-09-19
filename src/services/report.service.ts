import { ReportQueryInput } from "@/schemas/report.schema";
import prisma from "@/lib/prisma";
import { dateOnlyEnd, dateOnlyStart, formatDateOnly } from "@/lib/date-only";
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
};

export type ReportSummary = {
  totalWorkedMinutes: number;
  normalMinutes: number;
  overtime75FhcMinutes: number;
  overtime75FhcnMinutes: number;
  overtime100FhcMinutes: number;
  overtime100FhcnMinutes: number;
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
  daysWithRecords: number;
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
    daysWithRecords: 0,
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

  const timeSheets = await prisma.timesheet.findMany({
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
  });

  const rows: ReportRow[] = timeSheets.map((timeSheet) => ({
    id: timeSheet.id,
    date: formatDateToReportValue(timeSheet.date),
    dayType: getDayTypeLabel(timeSheet.isHoliday, timeSheet.isWeekend),
    status: timeSheet.status,
    isHoliday: timeSheet.isHoliday,
    isWeekend: timeSheet.isWeekend,
    totalWorkedMinutes: timeSheet.totalWorkedMinutes,
    normalMinutes: timeSheet.normalMinutes,
    overtime75FhcMinutes: timeSheet.overtime75FhcMinutes,
    overtime75FhcnMinutes: timeSheet.overtime75FhcnMinutes,
    overtime100FhcMinutes: timeSheet.overtime100FhcMinutes,
    overtime100FhcnMinutes: timeSheet.overtime100FhcnMinutes,
  }));

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
  const sheets = await prisma.timesheet.findMany({
    where: {
      workspaceId,
      userId: { in: [...new Set(userIds)] },
      date: { gte: start, lte: end },
    },
    orderBy: [{ user: { name: "asc" } }, { date: "asc" }],
    select: {
      user: { select: { id: true, name: true, email: true } },
      totalWorkedMinutes: true,
      normalMinutes: true,
      overtime75FhcMinutes: true,
      overtime75FhcnMinutes: true,
      overtime100FhcMinutes: true,
      overtime100FhcnMinutes: true,
    },
  });

  const rows = new Map<string, TeamReportRow>();
  for (const sheet of sheets) {
    const current = rows.get(sheet.user.id) ?? emptyTeamRow(sheet.user);
    current.daysWithRecords += 1;
    current.totalWorkedMinutes += sheet.totalWorkedMinutes;
    current.normalMinutes += sheet.normalMinutes;
    current.overtime75Minutes +=
      sheet.overtime75FhcMinutes + sheet.overtime75FhcnMinutes;
    current.overtime100Minutes +=
      sheet.overtime100FhcMinutes + sheet.overtime100FhcnMinutes;
    rows.set(sheet.user.id, current);
  }

  if (userIds.length > 0 && rows.size < userIds.length) {
    const missing = await prisma.user.findMany({
      where: { id: { in: userIds.filter((id) => !rows.has(id)) } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    for (const user of missing) rows.set(user.id, emptyTeamRow(user));
  }

  return {
    rows: [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    period: { startDate, endDate },
  };
}
