import "server-only";

import { DashboardService } from "@/services/dashboard.service";
import { TimeEntryService } from "@/services/time-entry.service";
import { getReportData } from "@/services/report.service";
import type { DashboardData, DashboardQuery } from "./dashboard";

export async function loadDashboardData(
  userId: string,
  { startDate, endDate }: Pick<DashboardQuery, "startDate" | "endDate">,
): Promise<DashboardData> {
  const [entries, clockState, today, month, weeklyReport] = await Promise.all([
    TimeEntryService.getTodayMovements(userId),
    TimeEntryService.getClockState(userId),
    DashboardService.getTodaySummary(userId),
    DashboardService.getMonthSummary(userId),
    getReportData({ userId, startDate, endDate }),
  ]);

  return {
    entries,
    clockState,
    today,
    // O resumo e o gráfico vêm da mesma consulta e, portanto, nunca usam
    // intervalos semanais diferentes.
    week: weeklyReport.summary,
    month,
    weeklyRows: weeklyReport.rows,
  };
}
