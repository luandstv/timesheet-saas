"use client";

import { LoaderCircle, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

import { updateActivity, removeActivity } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ActivityDraft = {
  description: string;
  incidentCode: string;
  activityDate: string;
  startTime: string;
  endTime: string;
};

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function timeValue(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function displayTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function draftFor(activity: Activity): ActivityDraft {
  return {
    description: activity.description,
    incidentCode: activity.incidentCode ?? "",
    activityDate: dateValue(activity.startTime),
    startTime: activity.endTime ? timeValue(activity.startTime) : "",
    endTime: activity.endTime ? timeValue(activity.endTime) : "",
  };
}

export function ActivityList({ activities }: { activities: Activity[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ActivityDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleEditStart(activity: Activity) {
    if (pendingId) return;
    setError(null);
    setEditingId(activity.id);
    setDraft(draftFor(activity));
  }

  function handleEditCancel() {
    if (pendingId) return;
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  async function handleUpdate(id: string) {
    if (pendingId || !draft) return;
    setPendingId(id);
    setError(null);
    const result = await updateActivity({ activityId: id, ...draft });
    if (result.success) {
      setEditingId(null);
      setDraft(null);
    } else {
      setError(result.error ?? "Não foi possível atualizar a atividade.");
    }
    setPendingId(null);
  }

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
      {activities.map((activity) => {
        const isEditing = editingId === activity.id && draft;
        return (
          <div
            key={activity.id}
            className="rounded-lg border border-border/70 bg-muted/20 p-3"
          >
            {isEditing ? (
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={`activity-edit-description-${activity.id}`}>
                    Atividade ou acionamento
                  </Label>
                  <Input
                    id={`activity-edit-description-${activity.id}`}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    maxLength={500}
                    disabled={pendingId !== null}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`activity-edit-date-${activity.id}`}>Dia</Label>
                    <Input
                      id={`activity-edit-date-${activity.id}`}
                      type="date"
                      value={draft.activityDate}
                      onChange={(event) =>
                        setDraft({ ...draft, activityDate: event.target.value })
                      }
                      disabled={pendingId !== null}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`activity-edit-incident-${activity.id}`}>
                      Incidente (opcional)
                    </Label>
                    <Input
                      id={`activity-edit-incident-${activity.id}`}
                      value={draft.incidentCode}
                      onChange={(event) =>
                        setDraft({ ...draft, incidentCode: event.target.value })
                      }
                      maxLength={80}
                      disabled={pendingId !== null}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`activity-edit-start-${activity.id}`}>
                      Início (opcional)
                    </Label>
                    <Input
                      id={`activity-edit-start-${activity.id}`}
                      type="time"
                      value={draft.startTime}
                      onChange={(event) =>
                        setDraft({ ...draft, startTime: event.target.value })
                      }
                      disabled={pendingId !== null}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`activity-edit-end-${activity.id}`}>
                      Fim (opcional)
                    </Label>
                    <Input
                      id={`activity-edit-end-${activity.id}`}
                      type="time"
                      value={draft.endTime}
                      onChange={(event) =>
                        setDraft({ ...draft, endTime: event.target.value })
                      }
                      disabled={pendingId !== null}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleEditCancel}
                    disabled={pendingId !== null}
                  >
                    <X />
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleUpdate(activity.id)}
                    disabled={pendingId !== null}
                  >
                    {pendingId === activity.id ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Save />
                    )}
                    {pendingId === activity.id ? "Salvando..." : "Salvar alteração"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{activity.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activity.endTime
                      ? `${displayTime(activity.startTime)} – ${displayTime(activity.endTime)}`
                      : "Horário não informado"}
                    {activity.incidentCode ? ` · ${activity.incidentCode}` : ""}
                  </p>
                </div>
                <span className="text-sm font-medium text-primary">
                  {activity.period
                    ? `${formatMinutesToHours(activity.durationMinutes)} · ${activity.period}`
                    : "Dia registrado"}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleEditStart(activity)}
                    disabled={pendingId !== null}
                    aria-label="Editar atividade"
                  >
                    <Pencil className="size-4" />
                  </Button>
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
              </div>
            )}
          </div>
        );
      })}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
