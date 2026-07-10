import { ClockCard } from "@/components/shared/clock-card";
import { TimeEntriesList } from "@/components/shared/time-entries-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/lib/auth";
import { TIMEZONE } from "@/lib/constants";
import { TimeEntryService } from "@/services/time-entry.service";
import { DateTime } from "luxon";

export default async function TimeEntriesPage() {
  const user = await getAuthenticatedUser();
  const timeSheet = await TimeEntryService.getTodayEntries(user.id);

  const entries = [...(timeSheet?.entries || [])];

  const sortedEntries = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  const lastEntry = sortedEntries[sortedEntries.length - 1] ?? null;

  console.log("LAST ENTRY:", lastEntry?.type);

  let nextType: "CLOCK_IN" | "CLOCK_OUT";

  if (!lastEntry || lastEntry.type === "CLOCK_OUT") {
    nextType = "CLOCK_IN";
  } else {
    nextType = "CLOCK_OUT";
  }

  const lastEntryTime = lastEntry
    ? DateTime.fromJSDate(lastEntry.timestamp)
        .setZone(TIMEZONE)
        .toFormat("HH:mm:ss")
    : null;

  const today = DateTime.now()
    .setZone(TIMEZONE)
    .toFormat("cccc, dd 'de' LLLL 'de' yyyy", { locale: "pt-BR" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registro de Ponto</h1>
        <p className="text-muted-foreground capitalize">{today}</p>
      </div>

      <ClockCard nextType={nextType} lastEntryTime={lastEntryTime} />

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
