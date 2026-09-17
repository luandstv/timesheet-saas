import { effectiveEntries } from "@/lib/effective-entries";
import prisma from "@/lib/prisma";
import type { Database } from "./workspace.service";
import { dateOnlyStart, formatDateOnly } from "@/lib/date-only";

export async function loadEffectiveUser(userId: string, db: Database = prisma) {
  const [raw, requests] = await Promise.all([
    db.timeEntry.findMany({
      where: { timesheet: { userId } },
      include: { timesheet: true },
    }),
    db.adjustmentRequest.findMany({
      where: { timesheet: { userId }, status: { in: ["APPROVED", "PENDING"] } },
      include: { timesheet: true },
    }),
  ]);
  const sheets = new Map(
    [...raw, ...requests].map((item) => [item.timesheet.id, item.timesheet]),
  );
  return effectiveEntries(raw, requests).map((entry) => ({
    ...entry,
    timesheet: sheets.get(entry.timeSheetId)!,
  }));
}

export async function assertMonthOpen(
  db: Database,
  workspaceId: string,
  userId: string,
  date: Date,
) {
  const month = dateOnlyStart(formatDateOnly(date).slice(0, 7) + "-01");
  const closed = await db.monthlyClosure.findUnique({
    where: { workspaceId_userId_month: { workspaceId, userId, month } },
  });
  if (closed?.closed)
    throw new Error(
      "Este mês está fechado. Solicite a reabertura antes de alterar os registros.",
    );
}

export async function recalculate(db: Database, sheetId: string, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const { TimeCalculationService } = await import("./time-calculation.service");
  await TimeCalculationService.calculateAndUpdateTimeSheet(
    sheetId,
    user.dailyHours,
    {
      startHour: user.workStartHour,
      startMinute: user.workStartMinute,
      endHour: user.workEndHour,
      endMinute: user.workEndMinute,
    },
    db,
  );
}
