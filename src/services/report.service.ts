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
