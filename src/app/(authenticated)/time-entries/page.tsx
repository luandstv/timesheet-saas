import { ClockCard } from "@/components/shared/clock-card";
import { TimeEntriesList } from "@/components/shared/time-entries-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/lib/auth";
import { TIMEZONE } from "@/lib/constants";
import { formatMinutesToHours } from "@/lib/format";
import { DashboardService } from "@/services/dashboard.service";
import { TimeEntryService } from "@/services/time-entry.service";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";

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
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div>
        <p className="mb-3 text-xs font-medium tracking-[0.18em] text-primary">
          MEU PONTO
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Seu registro, sem ruído.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          <span className="capitalize">{fullDateString}</span>. Ações rápidas
          para marcar a jornada e uma leitura completa do dia.
        </p>
      </div>

      <ClockCard nextType={nextType} lastEntryTime={lastEntryTime} dateLabel={fullDateString} />

      {todaySummary.totalWorkedMinutes > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Registros de hoje</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Todos os movimentos registrados neste dia.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            {entries.length} {entries.length === 1 ? "movimento" : "movimentos"}
          </Badge>
        </CardHeader>
        <CardContent>
          <TimeEntriesList entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
