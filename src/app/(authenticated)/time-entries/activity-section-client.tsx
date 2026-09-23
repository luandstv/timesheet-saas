"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityDateFilter } from "./activity-date-filter";
import { ActivityForm } from "./activity-form";
import { ActivityList } from "./activity-list";
import type { Activity } from "./activity-types";

function ActivityListSkeleton() {
  return (
    <div
      className="space-y-2"
      role="status"
      aria-live="polite"
      aria-label="Carregando atividades"
    >
      <div className="h-16 animate-pulse rounded-lg border border-border/50 bg-muted/30" />
      <div className="h-16 animate-pulse rounded-lg border border-border/50 bg-muted/30" />
    </div>
  );
}

export function ActivitySectionClient({
  activities,
  dateValue,
  dateLabel,
}: {
  activities: Activity[];
  dateValue: string;
  dateLabel: string;
}) {
  const [localActivities, setLocalActivities] = useState<Activity[]>(activities);
  const [navigating, setNavigating] = useState(false);

  function activityDateValue(activity: Activity) {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
    }).format(activity.startTime);
  }

  function handleActivitySaved(activity: Activity) {
    if (activityDateValue(activity) !== dateValue) return;
    setLocalActivities((current) => [
      activity,
      ...current.filter((item) => item.id !== activity.id),
    ]);
  }

  function handleActivityUpdated(activity: Activity) {
    setLocalActivities((current) =>
      activityDateValue(activity) === dateValue
        ? current.map((item) => (item.id === activity.id ? activity : item))
        : current.filter((item) => item.id !== activity.id),
    );
  }

  function handleActivityRemoved(activityId: string) {
    setLocalActivities((current) => current.filter((item) => item.id !== activityId));
  }

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
          <ActivityDateFilter
            value={dateValue}
            onNavigate={() => setNavigating(true)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActivityForm
          key={dateValue}
          initialDate={dateValue}
          onSaved={handleActivitySaved}
        />
        <p className="text-sm font-medium text-muted-foreground">
          Registros de {dateLabel}
        </p>
        {navigating ? (
          <ActivityListSkeleton />
        ) : (
          <ActivityList
            activities={localActivities}
            onUpdated={handleActivityUpdated}
            onRemoved={handleActivityRemoved}
          />
        )}
      </CardContent>
    </Card>
  );
}
