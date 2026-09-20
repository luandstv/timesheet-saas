"use client";

import { DateTime } from "luxon";
import { CalendarClock, Clock3 } from "lucide-react";
import { useId, useState } from "react";

import { TIMEZONE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DateTimePickerProps = {
  id?: string;
  name: string;
  dateName?: string;
  defaultValue?: string;
  defaultDate?: string;
  required?: boolean;
  className?: string;
};

function getInitialValues(defaultValue?: string, defaultDate?: string) {
  const parsed = defaultValue
    ? DateTime.fromISO(defaultValue, { zone: TIMEZONE })
    : null;

  return {
    date: parsed?.isValid
      ? parsed.toFormat("yyyy-MM-dd")
      : defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(defaultDate)
        ? defaultDate
        : "",
    time: parsed?.isValid ? parsed.toFormat("HH:mm:ss") : "",
  };
}

function formatDateLabel(date: string, time: string) {
  if (!date) return "Selecione a data";

  const dateLabel = DateTime.fromISO(date, { zone: TIMEZONE }).toFormat("dd/MM/yyyy");
  return time ? `${dateLabel} · ${time}` : `${dateLabel} · definir horário`;
}

export function DateTimePicker({
  id,
  name,
  dateName,
  defaultValue,
  defaultDate,
  required = false,
  className,
}: DateTimePickerProps) {
  const generatedId = useId();
  const triggerId = id ?? `date-time-picker-${generatedId}`;
  const initial = getInitialValues(defaultValue, defaultDate);
  const [dateValue, setDateValue] = useState(initial.date);
  const [timeValue, setTimeValue] = useState(initial.time);
  const selectedDate = dateValue
    ? DateTime.fromISO(dateValue, { zone: TIMEZONE }).toJSDate()
    : undefined;
  const timestamp = dateValue && timeValue ? `${dateValue}T${timeValue}` : "";

  return (
    <div className={cn("space-y-2", className)}>
      <input type="hidden" name={name} value={timestamp} />
      {dateName && <input type="hidden" name={dateName} value={dateValue} />}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            type="button"
            variant="outline"
            aria-required={required}
            className="w-full justify-start text-left font-normal"
          >
            <CalendarClock className="mr-2 size-4 text-muted-foreground" />
            <span className={cn(!dateValue && "text-muted-foreground")}>
              {formatDateLabel(dateValue, timeValue)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            className="!w-[248px]"
            classNames={{
              months: "w-full !max-w-full",
              month: "w-full",
              month_grid: "w-full table-fixed",
            }}
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setDateValue(
                date
                  ? DateTime.fromJSDate(date, { zone: TIMEZONE }).toFormat("yyyy-MM-dd")
                  : "",
              );
            }}
            defaultMonth={selectedDate}
            captionLayout="dropdown"
            startMonth={DateTime.now()
              .setZone(TIMEZONE)
              .minus({ years: 5 })
              .startOf("year")
              .toJSDate()}
            endMonth={DateTime.now()
              .setZone(TIMEZONE)
              .plus({ years: 5 })
              .endOf("year")
              .toJSDate()}
          />
          <div className="border-t border-border/70 bg-muted/20 p-3">
            <div className="space-y-2">
              <label
                htmlFor={`${triggerId}-time`}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
              >
                <Clock3 className="size-3.5" aria-hidden="true" />
                Horário de Brasília
              </label>
              <Input
                id={`${triggerId}-time`}
                type="time"
                step="1"
                value={timeValue}
                onChange={(event) => setTimeValue(event.target.value)}
                disabled={!dateValue}
                aria-label="Horário de Brasília"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Escolha a data e o horário antes de enviar a solicitação.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
