import { DateTime } from "luxon";

import { TIMEZONE } from "../constants";
import { reportQuerySchema, type ReportQueryInput } from "../../schemas/report.schema";

type ReportSearchParams = {
  startDate?: string | string[];
  endDate?: string | string[];
};

function formatDateToQueryValue(date: DateTime) {
  return date.toFormat("yyyy-MM-dd");
}

export function parseQueryDateToJSDate(value: string) {
  const parsed = DateTime.fromISO(value, { zone: TIMEZONE });

  if (!parsed.isValid) {
    return undefined;
  }

  return parsed.toJSDate();
}

export function formatReportDateToDisplay(value: string) {
  const parsed = DateTime.fromISO(value, { zone: TIMEZONE });

  if (!parsed.isValid) return value;

  return parsed.toFormat("dd/MM/yyyy");
}

export function formatDateToDisplay(date: Date) {
  return DateTime.fromJSDate(date, { zone: TIMEZONE }).toFormat("dd/MM/yyyy");
}

export function formatReportPeriodLabel(startDate: string, endDate: string) {
  const start = parseQueryDateToJSDate(startDate);
  const end = parseQueryDateToJSDate(endDate);

  if (!start || !end) {
    return "Período inválido";
  }

  const formattedStartDate = formatDateToDisplay(start);
  const formattedEndDate = formatDateToDisplay(end);

  return `${formattedStartDate} - ${formattedEndDate}`;
}

function getSingValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function getCurrentMonthDateRange(): ReportQueryInput {
  const now = DateTime.now().setZone(TIMEZONE);

  const startDate = now.startOf("month");
  const endDate = now.endOf("month");

  return {
    startDate: formatDateToQueryValue(startDate),
    endDate: formatDateToQueryValue(endDate),
  };
}

export function getValidatedReportQuery(
  searchParams: ReportSearchParams,
): ReportQueryInput {
  const fallbackRange = getCurrentMonthDateRange();

  const normalizedStartDate = getSingValue(searchParams.startDate);
  const normalizedendDate = getSingValue(searchParams.endDate);

  const payload = {
    startDate: normalizedStartDate ?? fallbackRange.startDate,
    endDate: normalizedendDate ?? fallbackRange.endDate,
  };

  const result = reportQuerySchema.safeParse(payload);

  if (!result.success) {
    return fallbackRange;
  }

  return result.data;
}
