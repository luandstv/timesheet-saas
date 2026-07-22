import { ClockCard } from "@/components/shared/clock-card";
import { TimeEntriesList } from "@/components/shared/time-entries-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/lib/auth";
import { TIMEZONE } from "@/lib/constants";
import { formatMinutesToHours } from "@/lib/format";
import { DashboardService } from "@/services/dashboard.service";
import { TimeEntryService } from "@/services/time-entry.service";
import { DateTime } from "luxon";

export default async function TimeEntriesPage() {
  const user = await getAuthenticatedUser();
  const timeSheet = await TimeEntryService.getTodayEntries(user.id);

  const entries = [...(timeSheet?.entries || [])];

  const todaySummary = await DashboardService.getTodaySummary(user.id);

  const sortedEntries = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  const lastEntry = sortedEntries[sortedEntries.length - 1] ?? null;

  const lastEntryTime = lastEntry
    ? DateTime.fromJSDate(lastEntry.timestamp)
        .setZone(TIMEZONE)
        .toFormat("HH:mm:ss")
    : null;

  let nextType: "CLOCK_IN" | "CLOCK_OUT";

  if (!lastEntry || lastEntry.type === "CLOCK_OUT") {
    nextType = "CLOCK_IN";
  } else {
    nextType = "CLOCK_OUT";
  }

  const fullDateString = DateTime.now()
    .setZone(TIMEZONE)
    .toFormat("cccc, dd 'de' LLLL 'de' yyyy", { locale: "pt-BR" });

  const overtime75 =
    todaySummary.overtime75FhcMinutes + todaySummary.overtime75FhcnMinutes;

  const overtime100 =
    todaySummary.overtime100FhcMinutes + todaySummary.overtime100FhcnMinutes;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registro de Ponto</h1>
        <p className="text-muted-foreground capitalize">{fullDateString}</p>
      </div>

      <ClockCard nextType={nextType} lastEntryTime={lastEntryTime} />

      {todaySummary.totalWorkedMinutes > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMinutesToHours(todaySummary.totalWorkedMinutes)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
              <CardTitle className="text-sm font-medium">Normal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMinutesToHours(todaySummary.normalMinutes)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
              <CardTitle className="text-sm font-medium">Extra 75%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMinutesToHours(overtime75)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
              <CardTitle className="text-sm font-medium">Extra 100%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMinutesToHours(overtime100)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registros de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeEntriesList entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
