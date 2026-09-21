"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityDateFilter } from "./activity-date-filter";
import { ActivityForm } from "./activity-form";
import { ActivityList, type Activity } from "./activity-list";

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
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [navigating, setNavigating] = useState(false);

  function refreshActivities() {
    startTransition(() => router.refresh());
  }

  const loading = refreshing || navigating;

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
          onSaved={refreshActivities}
        />
        <p className="text-sm font-medium text-muted-foreground">
          Registros de {dateLabel}
        </p>
        {loading ? (
          <ActivityListSkeleton />
        ) : (
          <ActivityList activities={activities} onChanged={refreshActivities} />
        )}
      </CardContent>
    </Card>
  );
}
