import { DateTime } from "luxon";

import prisma from "@/lib/prisma";
import { dateOnlyStart, formatDateOnly } from "@/lib/date-only";
import { TIMEZONE } from "@/lib/constants";
import { calculateCompensation } from "@/lib/compensation";

export type CompensationResult = {
  period: { startDate: string; endDate: string };
  salaryConfigured: boolean;
  baseSalary: number;
  monthlyHours: number;
  hourlyRate: number;
  normalMinutes: number;
  overtime75Minutes: number;
  overtime100Minutes: number;
  overtimeValue: number;
  onCallMinutes: number;
  onCallValue: number;
  dsrValue: number;
  variableValue: number;
  estimatedGrossValue: number;
  workDays: number;
  restDays: number;
  pendingAdjustments: number;
  provisional: boolean;
};

type CompensationParams = {
  userId: string;
  workspaceId: string;
  startDate: string;
  endDate: string;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDate(value: string) {
  const date = DateTime.fromISO(value, { zone: TIMEZONE });
  if (!date.isValid || date.toFormat("yyyy-MM-dd") !== value) {
    throw new Error("Período inválido.");
  }
  return date.startOf("day");
}

function countDsrDays(start: DateTime, end: DateTime, holidayDates: Set<string>) {
  let workDays = 0;
  let restDays = 0;
  let cursor = start;

  while (cursor <= end) {
    const key = cursor.toFormat("yyyy-MM-dd");
    const isHoliday = holidayDates.has(key);
    const isWeekend = cursor.weekday === 6 || cursor.weekday === 7;
    if (!isWeekend && !isHoliday) workDays += 1;
    if (cursor.weekday === 7 || (isHoliday && cursor.weekday !== 7)) restDays += 1;
    cursor = cursor.plus({ days: 1 });
  }

  return { workDays, restDays };
}

export async function getCompensationData({
  userId,
  workspaceId,
  startDate,
  endDate,
}: CompensationParams): Promise<CompensationResult> {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (start > end) throw new Error("A data inicial não pode ser maior que a final.");

  const range = {
    gte: dateOnlyStart(start),
    lt: dateOnlyStart(end.plus({ days: 1 })),
  };
  const [salary, sheets, onCallDays, holidays, pendingAdjustments] = await Promise.all([
    prisma.userSalaryConfig.findFirst({
      where: { userId },
      orderBy: { validFrom: "desc" },
    }),
    prisma.timesheet.findMany({
      where: { userId, workspaceId, date: range },
      select: {
        date: true,
        status: true,
        normalMinutes: true,
        overtime75FhcMinutes: true,
        overtime75FhcnMinutes: true,
        overtime100FhcMinutes: true,
        overtime100FhcnMinutes: true,
      },
    }),
    prisma.onCallSchedule.findMany({
      where: { userId, workspaceId, date: range },
      select: { date: true, totalOnCallMinutes: true },
    }),
    prisma.holiday.findMany({ where: { date: range }, select: { date: true } }),
    prisma.adjustmentRequest.count({
      where: {
        status: "PENDING",
        timesheet: { workspaceId, userId, date: range },
      },
    }),
  ]);
  const holidayDates = new Set(holidays.map((holiday) => formatDateOnly(holiday.date)));
  const { workDays, restDays } = countDsrDays(start, end, holidayDates);
  const baseSalary = salary ? Number(salary.baseSalary) : 0;
  const monthlyHours = salary?.monthlyHours ?? 220;
  const overtime75Minutes = sheets.reduce(
    (sum, sheet) => sum + sheet.overtime75FhcMinutes + sheet.overtime75FhcnMinutes,
    0,
  );
  const overtime100Minutes = sheets.reduce(
    (sum, sheet) => sum + sheet.overtime100FhcMinutes + sheet.overtime100FhcnMinutes,
    0,
  );
  const normalMinutes = sheets.reduce((sum, sheet) => sum + sheet.normalMinutes, 0);
  const onCallMinutes = onCallDays.reduce(
    (sum, day) => sum + day.totalOnCallMinutes,
    0,
  );
  const values = calculateCompensation({
    baseSalary,
    monthlyHours,
    overtime75Minutes,
    overtime100Minutes,
    onCallMinutes,
    workDays,
    restDays,
  });
  const provisional =
    pendingAdjustments > 0 || sheets.some((sheet) => sheet.status !== "APPROVED");

  return {
    period: { startDate, endDate },
    salaryConfigured: Boolean(salary),
    baseSalary: roundMoney(baseSalary),
    monthlyHours,
    hourlyRate: roundMoney(values.hourlyRate),
    normalMinutes,
    overtime75Minutes,
    overtime100Minutes,
    overtimeValue: roundMoney(values.overtimeValue),
    onCallMinutes,
    onCallValue: roundMoney(values.onCallValue),
    dsrValue: roundMoney(values.dsrValue),
    variableValue: roundMoney(values.variableValue),
    estimatedGrossValue: roundMoney(values.estimatedGrossValue),
    workDays,
    restDays,
    pendingAdjustments,
    provisional,
  };
}
