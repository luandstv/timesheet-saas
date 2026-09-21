"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";

import { createActivity } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ActivityForm() {
  const now = new Date();
  const [description, setDescription] = useState("");
  const [incidentCode, setIncidentCode] = useState("");
  const [startTime, setStartTime] = useState(
    localDateTimeValue(new Date(now.getTime() - 60 * 60 * 1000)),
  );
  const [endTime, setEndTime] = useState(localDateTimeValue(now));
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
      startTime,
      endTime,
    });
    if (result.success) {
      setDescription("");
      setIncidentCode("");
      setSuccess(true);
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
      <div className="grid gap-4 sm:grid-cols-3">
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
          <Label htmlFor="activity-start">Início</Label>
          <Input
            id="activity-start"
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="activity-end">Fim</Label>
          <Input
            id="activity-end"
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
            disabled={pending}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {success ? "Atividade registrada." : error}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Plus />}
          {pending ? "Salvando..." : "Adicionar atividade"}
        </Button>
      </div>
    </form>
  );
}
