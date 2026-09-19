"use client";

import { useMemo, useState, useTransition } from "react";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ListChecks,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { formatMinutesToHours } from "@/lib/format";
import type { OnCallDay } from "@/services/on-call.service";
import type { OnCallHolidayMode } from "@/lib/on-call";
import { removeOnCallDay, saveOnCallDay, saveOnCallDays } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function dateKey(date: DateTime) {
  return date.toFormat("yyyy-MM-dd");
}

function monthLabel(monthKey: string) {
  return DateTime.fromISO(`${monthKey}-01`, { zone: "America/Sao_Paulo" })
    .setLocale("pt-BR")
    .toFormat("LLLL yyyy");
}

function buildCalendarDays(monthKey: string) {
  const month = DateTime.fromISO(`${monthKey}-01`, { zone: "America/Sao_Paulo" });
  const first = month.startOf("month");
  const offset = first.weekday % 7;
  const start = first.minus({ days: offset });
  return Array.from({ length: 42 }, (_, index) => start.plus({ days: index }));
}

export function OnCallCalendar({
  monthKey,
  days,
  readOnly = false,
  personId,
}: {
  monthKey: string;
  days: OnCallDay[];
  readOnly?: boolean;
  personId?: string;
}) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(days[0]?.date ?? `${monthKey}-01`);
  const [holidayMode, setHolidayMode] = useState<OnCallHolidayMode>(
    days[0]?.holidayMode ?? "auto",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSelecting, setIsSelecting] = useState(false);
  const [batchDates, setBatchDates] = useState<string[]>([]);
  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const calendarDays = useMemo(() => buildCalendarDays(monthKey), [monthKey]);
  const selected = dayMap.get(selectedDate);
  const activeMonth = DateTime.fromISO(`${monthKey}-01`, { zone: "America/Sao_Paulo" });
  const totalMinutes = days.reduce((sum, day) => sum + day.totalOnCallMinutes, 0);
  const restDays = days.filter((day) => day.isWeekend || day.isHoliday).length;

  function navigateMonth(offset: number) {
    const target = activeMonth.plus({ months: offset }).toFormat("yyyy-MM");
    const params = new URLSearchParams({ month: target });
    if (personId) params.set("person", personId);
    router.push(`/on-call?${params.toString()}`);
  }

  function chooseDate(date: DateTime) {
    const key = dateKey(date);
    const day = dayMap.get(key);
    setSelectedDate(key);
    setHolidayMode(day?.holidayMode ?? "auto");
    setMessage(null);
  }

  function toggleSelectionMode() {
    setIsSelecting((current) => !current);
    setBatchDates([]);
    setHolidayMode("auto");
    setMessage(null);
  }

  function toggleBatchDate(date: DateTime) {
    if (date.month !== activeMonth.month || date.year !== activeMonth.year) return;
    const key = dateKey(date);
    setSelectedDate(key);
    setBatchDates((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key].sort(),
    );
    setMessage(null);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveOnCallDay({ date: selectedDate, holidayMode });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  function remove() {
    setMessage(null);
    startTransition(async () => {
      const result = await removeOnCallDay(selectedDate);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  function saveBatch() {
    if (batchDates.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveOnCallDays({ dates: batchDates, holidayMode });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <Card className="overflow-visible">
        <CardHeader className="gap-4 border-b border-border/80 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl capitalize">
                {monthLabel(monthKey)}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {readOnly
                  ? "Consulte os dias em que esta pessoa ficará disponível para acionamentos."
                  : "Marque os dias em que você ficará disponível para acionamentos."}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Mês anterior"
                onClick={() => navigateMonth(-1)}
              >
                <ArrowLeft />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (personId) params.set("person", personId);
                  router.push(`/on-call${params.size ? `?${params}` : ""}`);
                }}
              >
                Hoje
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Próximo mês"
                onClick={() => navigateMonth(1)}
              >
                <ArrowRight />
              </Button>
            </div>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant={isSelecting ? "secondary" : "outline"}
              size="sm"
              aria-pressed={isSelecting}
              onClick={toggleSelectionMode}
              className="w-fit"
            >
              {isSelecting ? <X /> : <ListChecks />}
              {isSelecting ? "Cancelar seleção" : "Selecionar vários dias"}
            </Button>
          )}
          {isSelecting && (
            <p className="rounded-xl border border-primary/25 bg-primary/8 px-3 py-2 text-sm text-muted-foreground">
              Clique nos dias deste mês para preparar a escala e confirme tudo de uma
              vez.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <SummaryTile label="Dias marcados" value={String(days.length)} />
            <SummaryTile
              label="Disponibilidade"
              value={formatMinutesToHours(totalMinutes)}
            />
            <SummaryTile label="Fim de semana/feriado" value={String(restDays)} />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-5">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="py-2">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((date) => {
              const key = dateKey(date);
              const day = dayMap.get(key);
              const outside = date.month !== activeMonth.month;
              const isSelected = key === selectedDate;
              const isBatchSelected = batchDates.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    isSelecting ? toggleBatchDate(date) : chooseDate(date)
                  }
                  disabled={isSelecting && outside}
                  aria-label={`${date.toFormat("dd/MM/yyyy")}${day ? ", sobreaviso marcado" : ", sem sobreaviso"}`}
                  aria-pressed={isSelecting ? isBatchSelected : isSelected}
                  className={cn(
                    "group flex min-h-20 min-w-0 flex-col items-start rounded-xl border p-2 text-left transition-colors focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 sm:min-h-24",
                    outside
                      ? "border-transparent bg-muted/20 text-muted-foreground/50"
                      : "border-border/70 bg-background/40 hover:border-primary/50 hover:bg-accent/40",
                    isSelected && "border-primary bg-primary/10 shadow-sm",
                    isBatchSelected &&
                      "border-primary bg-primary/20 shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_20%,transparent)]",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-1">
                    <span
                      className={cn("text-xs font-semibold", outside && "opacity-60")}
                    >
                      {date.day}
                    </span>
                    {isBatchSelected && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                    )}
                  </span>
                  {day && (
                    <span className="mt-auto flex w-full min-w-0 flex-col gap-1 pt-2">
                      <span className="truncate rounded-md bg-primary/15 px-1.5 py-1 text-[11px] font-semibold text-primary">
                        {day.totalOnCallMinutes / 60}h disponíveis
                      </span>
                      {(day.isWeekend || day.isHoliday) && (
                        <span className="truncate text-[10px] text-muted-foreground">
                          {day.isHoliday ? "Feriado" : "Fim de semana"}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit xl:sticky xl:top-6">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <CalendarDays className="size-5" />
            <CardTitle>Dia selecionado</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {DateTime.fromISO(selectedDate, { zone: "America/Sao_Paulo" })
              .setLocale("pt-BR")
              .toFormat("cccc, dd 'de' LLLL")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSelecting ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/30 bg-primary/8 p-4">
                <p className="font-medium">Seleção em lote</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {batchDates.length === 0
                    ? "Nenhum dia selecionado ainda."
                    : `${batchDates.length} ${batchDates.length === 1 ? "dia pronto" : "dias prontos"} para confirmação.`}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="on-call-batch-holiday-mode"
                  className="text-sm font-medium"
                >
                  Tipo aplicado aos dias
                </label>
                <Select
                  value={holidayMode}
                  onValueChange={(value) => setHolidayMode(value as OnCallHolidayMode)}
                >
                  <SelectTrigger id="on-call-batch-holiday-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático pelo calendário</SelectItem>
                    <SelectItem value="holiday">Marcar como feriado</SelectItem>
                    <SelectItem value="workday">Marcar como dia útil</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  O tipo escolhido será aplicado a todos os dias selecionados.
                </p>
              </div>

              <Button
                type="button"
                onClick={saveBatch}
                disabled={isPending || batchDates.length === 0}
                className="min-h-11 w-full rounded-[11px] px-4 text-sm font-semibold leading-5 shadow-sm"
              >
                <Check />
                {isPending ? "Salvando…" : `Confirmar ${batchDates.length || "dias"}`}
              </Button>
            </div>
          ) : selected ? (
            <div className="rounded-xl border border-primary/30 bg-primary/8 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">Sobreaviso marcado</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMinutesToHours(selected.totalOnCallMinutes)} de
                    disponibilidade
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {selected.isHoliday
                    ? "Feriado"
                    : selected.isWeekend
                      ? "Fim de semana"
                      : "Dia útil"}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              Este dia ainda não está marcado na sua escala.
            </p>
          )}

          {readOnly ? (
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm leading-5 text-muted-foreground">
              Você está consultando a escala de outra pessoa. Valores de salário e
              remuneração continuam privados para cada usuário.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="on-call-holiday-mode" className="text-sm font-medium">
                  Tipo do dia
                </label>
                <Select
                  value={holidayMode}
                  onValueChange={(value) => setHolidayMode(value as OnCallHolidayMode)}
                >
                  <SelectTrigger id="on-call-holiday-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático pelo calendário</SelectItem>
                    <SelectItem value="holiday">Marcar como feriado</SelectItem>
                    <SelectItem value="workday">Marcar como dia útil</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  Dias úteis geram 15h. Fins de semana e feriados geram 24h por padrão.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                <Button
                  type="button"
                  onClick={save}
                  disabled={isPending}
                  className="min-h-11 flex-1 rounded-[11px] px-4 text-sm font-semibold leading-5 shadow-sm"
                >
                  <Check />
                  {isPending ? "Salvando…" : selected ? "Atualizar dia" : "Marcar dia"}
                </Button>
                {selected && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={remove}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 />
                    Remover
                  </Button>
                )}
              </div>
            </>
          )}

          {message && (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
