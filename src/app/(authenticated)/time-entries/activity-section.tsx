import { ActivityService } from "@/services/activity.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityDateFilter } from "./activity-date-filter";
import { ActivityForm } from "./activity-form";
import { ActivityList } from "./activity-list";

export async function ActivitySection({
  userId,
  workspaceId,
  date,
  dateLabel,
}: {
  userId: string;
  workspaceId: string;
  date: import("luxon").DateTime;
  dateLabel: string;
}) {
  const activities = await ActivityService.listDay(userId, workspaceId, date);
  const dateValue = date.toFormat("yyyy-MM-dd");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg">Atividades e acionamentos</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre várias atividades por dia, com horário opcional, para facilitar a
              conferência posterior.
            </p>
          </div>
          <ActivityDateFilter value={dateValue} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActivityForm key={dateValue} initialDate={dateValue} />
        <p className="text-sm font-medium text-muted-foreground">
          Registros de {dateLabel}
        </p>
        <ActivityList activities={activities} />
      </CardContent>
    </Card>
  );
}

export function ActivitySectionSkeleton({ dateLabel }: { dateLabel: string }) {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-5 w-56 animate-pulse rounded bg-muted" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="h-11 w-40 animate-pulse rounded-[11px] bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-28 animate-pulse rounded-xl bg-muted/50" />
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          Carregando atividades de {dateLabel}…
        </p>
        <div className="h-16 animate-pulse rounded-lg bg-muted/50" />
      </CardContent>
    </Card>
  );
}
