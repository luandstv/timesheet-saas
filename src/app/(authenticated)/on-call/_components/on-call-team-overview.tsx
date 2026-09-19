"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { CalendarDays, UsersRound } from "lucide-react";

import { formatMinutesToHours } from "@/lib/format";
import { TIMEZONE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OnCallTeamDay } from "@/services/on-call.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDay(date: string) {
  return DateTime.fromISO(date, { zone: TIMEZONE })
    .setLocale("pt-BR")
    .toFormat("ccc, dd/MM")
    .replace(/^./, (value) => value.toUpperCase());
}

function formatDayLong(date: string) {
  return DateTime.fromISO(date, { zone: TIMEZONE })
    .setLocale("pt-BR")
    .toFormat("cccc, dd 'de' LLLL")
    .replace(/^./, (value) => value.toUpperCase());
}

export function OnCallTeamOverview({ days }: { days: OnCallTeamDay[] }) {
  const [selectedDate, setSelectedDate] = useState(days[0]?.date ?? "");
  const selectedDay = days.find((day) => day.date === selectedDate) ?? days[0];
  const peopleCount = useMemo(
    () =>
      new Set(days.flatMap((day) => day.people.map((person) => person.userId))).size,
    [days],
  );

  if (days.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <UsersRound className="size-5" aria-hidden="true" />
            <CardTitle>Escala compartilhada</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Ninguém marcou disponibilidade neste período.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-2 border-b border-border/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <UsersRound className="size-5" aria-hidden="true" />
              <CardTitle>Escala compartilhada</CardTitle>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulte quem está de sobreaviso em cada dia do período.
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <UsersRound aria-hidden="true" />
            {peopleCount} {peopleCount === 1 ? "pessoa" : "pessoas"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <div className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {days.map((day) => {
            const names = day.people.map((person) => person.name).join(", ");
            const isSelected = day.date === selectedDay?.date;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                aria-pressed={isSelected}
                title={`${formatDayLong(day.date)} — ${names}`}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/70 bg-background/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{formatDay(day.date)}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[11px]",
                      (day.isHoliday || day.isWeekend) &&
                        "border-primary/40 text-primary",
                    )}
                  >
                    {day.isHoliday
                      ? "Feriado"
                      : day.isWeekend
                        ? "Fim de semana"
                        : "Dia útil"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {day.people.slice(0, 3).map((person) => (
                    <span
                      key={person.userId}
                      className="max-w-full truncate rounded-md bg-primary/12 px-2 py-1 text-xs font-medium text-primary"
                    >
                      {person.name}
                    </span>
                  ))}
                  {day.people.length > 3 && (
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      +{day.people.length - 3}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="h-fit rounded-2xl border border-primary/25 bg-primary/6 p-4">
            <div className="flex items-start gap-3">
              <CalendarDays
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">{formatDayLong(selectedDay.date)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedDay.people.length}{" "}
                  {selectedDay.people.length === 1
                    ? "pessoa escalada"
                    : "pessoas escaladas"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {selectedDay.people.map((person) => (
                <div
                  key={person.userId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/45 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.email}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {formatMinutesToHours(person.totalOnCallMinutes)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
