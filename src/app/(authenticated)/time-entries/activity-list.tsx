"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";

import { removeActivity } from "./actions";
import { Button } from "@/components/ui/button";
import { formatMinutesToHours } from "@/lib/format";

type Activity = {
  id: string;
  description: string;
  incidentCode: string | null;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number;
  period: string | null;
};

export function ActivityList({ activities }: { activities: Activity[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(id: string) {
    if (pendingId) return;
    setPendingId(id);
    setError(null);
    const result = await removeActivity(id);
    if (!result.success)
      setError(result.error ?? "Não foi possível remover a atividade.");
    setPendingId(null);
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma atividade registrada para este dia.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-muted/20 p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{activity.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activity.endTime
                ? `${activity.startTime.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} – ${activity.endTime.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Horário não informado"}
              {activity.incidentCode ? ` · ${activity.incidentCode}` : ""}
            </p>
          </div>
          <span className="text-sm font-medium text-primary">
            {activity.period
              ? `${formatMinutesToHours(activity.durationMinutes)} · ${activity.period}`
              : "Dia registrado"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handleRemove(activity.id)}
            disabled={pendingId !== null}
            aria-label="Remover atividade"
          >
            {pendingId === activity.id ? (
              <LoaderCircle className="size-4 motion-safe:animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
