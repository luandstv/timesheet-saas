import { ActivityService } from "@/services/activity.service";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ActivitySectionClient } from "./activity-section-client";

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
    <ActivitySectionClient
      key={dateValue}
      activities={activities}
      dateValue={dateValue}
      dateLabel={dateLabel}
    />
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
