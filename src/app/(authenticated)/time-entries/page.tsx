import { Suspense } from "react";
import { ClockCard } from "@/components/shared/clock-card";
import { TimeEntriesList } from "@/components/shared/time-entries-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { TIMEZONE } from "@/lib/constants";
import { buildClockPresentation } from "@/lib/clock-presentation";
import { formatMinutesToHours } from "@/lib/format";
import { DashboardService } from "@/services/dashboard.service";
import { TimeEntryService } from "@/services/time-entry.service";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { ActivitySection, ActivitySectionSkeleton } from "./activity-section";

type TimeEntriesPageProps = {
  searchParams?: Promise<{ activityDate?: string }>;
};

export default async function TimeEntriesPage({ searchParams }: TimeEntriesPageProps) {
  const { user, workspace, member, memberships } = await getWorkspaceContext();
  const now = DateTime.now().setZone(TIMEZONE);
  const query = (await searchParams) ?? {};
  const requestedActivityDate = query.activityDate;
  const parsedActivityDate = requestedActivityDate
    ? DateTime.fromISO(requestedActivityDate, { zone: TIMEZONE })
    : null;
  const selectedActivityDate =
    parsedActivityDate?.isValid &&
    parsedActivityDate <= now.startOf("day") &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedActivityDate ?? "")
      ? parsedActivityDate
      : now.startOf("day");
  const activityDateLabel = selectedActivityDate.toFormat("dd/MM/yyyy");

  const [entries, clockState, todaySummary] = await Promise.all([
    TimeEntryService.getTodayMovements(user.id, workspace.id),
    TimeEntryService.getClockState(user.id),
    DashboardService.getTodaySummary(user.id, workspace.id),
  ]);
  const clock = buildClockPresentation(clockState, now);
  const fullDateString = now.toFormat("cccc, dd 'de' LLLL 'de' yyyy", {
    locale: "pt-BR",
  });

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
          <span className="capitalize">{fullDateString}</span>. Ações rápidas para
          marcar a jornada e uma leitura completa do dia.
        </p>
      </div>

      <ClockCard
        workspaceId={workspace.id}
        disabled={!member.active}
        blockedMessage={
          clockState.lastEntry?.type === "CLOCK_IN" &&
          clockState.lastEntry.timesheet?.workspaceId !== workspace.id
            ? `Ponto aberto em ${memberships.find((item) => item.workspaceId === clockState.lastEntry?.timesheet?.workspaceId)?.workspace.name ?? "outro espaço"}. Troque de espaço para encerrá-lo.`
            : undefined
        }
        {...clock}
        dateLabel={fullDateString}
      />

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

      <Suspense fallback={<ActivitySectionSkeleton dateLabel={activityDateLabel} />}>
        <ActivitySection
          userId={user.id}
          workspaceId={workspace.id}
          date={selectedActivityDate}
          dateLabel={activityDateLabel}
        />
      </Suspense>
    </div>
  );
}
