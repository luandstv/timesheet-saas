"use client";

import { ChevronDown, Clock3, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, value) =>
  value.toString().padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, value) =>
  value.toString().padStart(2, "0"),
);

function readValue(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? { hour: match[1], minute: match[2] } : { hour: "", minute: "" };
}

export function TimePicker({
  id,
  value,
  onChange,
  placeholder = "Selecionar horário",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = readValue(value);

  function setPart(part: "hour" | "minute", nextValue: string) {
    const nextHour = part === "hour" ? nextValue : selected.hour || "00";
    const nextMinute = part === "minute" ? nextValue : selected.minute || "00";
    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "w-full justify-between text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Clock3
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] max-w-[calc(100vw-1rem)]" align="start">
        <PopoverHeader>
          <PopoverTitle>Horário da atividade</PopoverTitle>
          <PopoverDescription>Selecione hora e minuto.</PopoverDescription>
        </PopoverHeader>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={selected.hour}
            onValueChange={(nextValue) => setPart("hour", nextValue)}
          >
            <SelectTrigger aria-label="Hora" size="sm">
              <SelectValue placeholder="Hora" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour} value={hour}>
                  {hour} h
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selected.minute}
            onValueChange={(nextValue) => setPart("minute", nextValue)}
          >
            <SelectTrigger aria-label="Minuto" size="sm">
              <SelectValue placeholder="Minuto" />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((minute) => (
                <SelectItem key={minute} value={minute}>
                  {minute} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          disabled={!value}
        >
          <RotateCcw />
          Limpar horário
        </Button>
      </PopoverContent>
    </Popover>
  );
}
