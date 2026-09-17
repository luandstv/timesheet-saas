import "server-only";

import { DashboardService } from "@/services/dashboard.service";
import { TimeEntryService } from "@/services/time-entry.service";
import { getReportData } from "@/services/report.service";
import type { DashboardData, DashboardQuery } from "./dashboard";

export async function loadDashboardData(
  userId: string,
  workspaceId: string,
  { startDate, endDate }: Pick<DashboardQuery, "startDate" | "endDate">,
): Promise<DashboardData> {
  const [entries, clockState, today, month, weeklyReport] = await Promise.all([
    TimeEntryService.getTodayMovements(userId, workspaceId),
    TimeEntryService.getClockState(userId),
    DashboardService.getTodaySummary(userId, workspaceId),
    DashboardService.getMonthSummary(userId, workspaceId),
    getReportData({ userId, workspaceId, startDate, endDate }),
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
