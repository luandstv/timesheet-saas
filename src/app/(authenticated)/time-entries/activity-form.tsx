"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createActivity } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function localDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function ActivityForm({
  initialDate,
  onSaved,
}: {
  initialDate: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const now = new Date();
  const [description, setDescription] = useState("");
  const [incidentCode, setIncidentCode] = useState("");
  const [activityDate, setActivityDate] = useState(initialDate || localDateValue(now));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setSuccess(false);
    const result = await createActivity({
      description,
      incidentCode,
      activityDate,
      startTime,
      endTime,
    });
    if (result.success) {
      setDescription("");
      setIncidentCode("");
      setActivityDate(initialDate);
      setStartTime("");
      setEndTime("");
      setSuccess(true);
      onSaved?.();
      if (!onSaved) router.refresh();
    } else {
      setError(result.error ?? "Não foi possível salvar a atividade.");
    }
    setPending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="activity-description">Atividade ou acionamento</Label>
        <Input
          id="activity-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: investigação do incidente de produção"
          maxLength={500}
          required
          disabled={pending}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="activity-date">Dia</Label>
          <Input
            id="activity-date"
            type="date"
            value={activityDate}
            onChange={(event) => setActivityDate(event.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-1">
          <Label htmlFor="activity-incident">Incidente (opcional)</Label>
          <Input
            id="activity-incident"
            value={incidentCode}
            onChange={(event) => setIncidentCode(event.target.value)}
            placeholder="INC-123"
            maxLength={80}
            disabled={pending}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="activity-start">Início (opcional)</Label>
          <Input
            id="activity-start"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="activity-end">Fim (opcional)</Label>
          <Input
            id="activity-end"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            disabled={pending}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2 text-xs" aria-live="polite">
          <p className="text-muted-foreground">
            O horário é opcional. Sem horário, o registro fica associado somente ao dia.
          </p>
          {error && (
            <p
              className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-2.5 py-2 font-medium text-destructive"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {success && !error && (
            <p
              className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 font-medium text-emerald-700 dark:text-emerald-300"
              role="status"
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Atividade registrada com sucesso.
            </p>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Plus />}
          {pending ? "Salvando..." : "Adicionar atividade"}
        </Button>
      </div>
    </form>
  );
}
