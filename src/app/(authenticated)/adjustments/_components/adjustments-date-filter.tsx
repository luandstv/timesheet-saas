"use client";

import { DateTime } from "luxon";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CalendarCheck2, CalendarClock, CalendarIcon } from "lucide-react";

import { TIMEZONE } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type AdjustmentsDateFilterProps = {
  userId: string;
  startDate: string;
  endDate: string;
  tab: string;
  closed: boolean;
};

function parseDate(value: string) {
  const parsed = DateTime.fromISO(value, { zone: TIMEZONE });
  return parsed.isValid ? parsed.toJSDate() : undefined;
}

function formatDate(value: Date) {
  return DateTime.fromJSDate(value, { zone: TIMEZONE }).toFormat("yyyy-MM-dd");
}

function formatDateLabel(value: Date | undefined) {
  return value
    ? DateTime.fromJSDate(value, { zone: TIMEZONE }).toFormat("dd/MM/yyyy")
    : "Selecione a data";
}

export function AdjustmentsDateFilter({
  userId,
  startDate,
  endDate,
  tab,
  closed,
}: AdjustmentsDateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [startDateValue, setStartDateValue] = useState(() => parseDate(startDate));
  const [endDateValue, setEndDateValue] = useState(() => parseDate(endDate));
  const StatusIcon = closed ? CalendarCheck2 : CalendarClock;
  const statusClassName = closed
    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
    : "border-primary/35 bg-primary/10 text-accent-foreground dark:border-primary/40 dark:bg-primary/15";

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!startDateValue || !endDateValue) return;

    const start = DateTime.fromJSDate(startDateValue, { zone: TIMEZONE });
    const end = DateTime.fromJSDate(endDateValue, { zone: TIMEZONE });
    if (start > end) return;

    const params = new URLSearchParams(window.location.search);
    params.set("userId", userId);
    params.set("startDate", formatDate(startDateValue));
    params.set("endDate", formatDate(endDateValue));
    params.set("month", formatDate(startDateValue).slice(0, 7));
    params.set("tab", params.get("tab") ?? tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card size="sm" className="rounded-[22px]">
      <CardContent className="p-5 sm:p-6">
        <form
          onSubmit={handleApply}
          className="flex flex-col gap-5 md:flex-row md:flex-wrap md:items-end"
        >
          <div className="grid gap-2">
            <Label htmlFor="adjustments-start-date">Data inicial</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="adjustments-start-date"
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal md:w-56"
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {formatDateLabel(startDateValue)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateValue}
                  onSelect={setStartDateValue}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adjustments-end-date">Data final</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="adjustments-end-date"
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal md:w-56"
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {formatDateLabel(endDateValue)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateValue}
                  onSelect={setEndDateValue}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button type="submit" className="w-full md:w-auto">
            Consultar período
          </Button>
          <Badge
            variant="outline"
            className={`h-8 gap-1.5 rounded-full px-3 text-xs font-semibold ${statusClassName}`}
          >
            <StatusIcon aria-hidden="true" />
            <span>{closed ? "Mês fechado" : "Mês aberto"}</span>
          </Badge>
        </form>
      </CardContent>
    </Card>
  );
}
