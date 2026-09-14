"use client";

import { DateTime } from "luxon";
import { CalendarIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { TIMEZONE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import {
  formatDateToDisplay,
  parseQueryDateToJSDate,
} from "@/lib/reports/report-helpers";

type ReportFilterProps = {
  startDate: string;
  endDate: string;
};

function formatDateToQueryValue(date: Date) {
  return DateTime.fromJSDate(date, { zone: TIMEZONE }).toFormat("yyyy-MM-dd");
}

export function ReportFilter({ startDate, endDate }: ReportFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [startDateValue, setStartDateValue] = useState<Date | undefined>(
    parseQueryDateToJSDate(startDate),
  );
  const [endDateValue, setEndDateValue] = useState<Date | undefined>(
    parseQueryDateToJSDate(endDate),
  );

  function handleApplyFilters() {
    if (!startDateValue || !endDateValue) {
      return;
    }

    const params = new URLSearchParams();

    params.set("startDate", formatDateToQueryValue(startDateValue));
    params.set("endDate", formatDateToQueryValue(endDateValue));

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-end">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Data inicial</label>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-60 justify-start text-left font-normal",
                !startDateValue && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDateValue ? (
                formatDateToDisplay(startDateValue)
              ) : (
                <span>Selecione a data</span>
              )}
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
        <label className="text-sm font-medium">Data final</label>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-60 justify-start text-left font-normal",
                !endDateValue && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDateValue ? (
                formatDateToDisplay(endDateValue)
              ) : (
                <span>Selecione a data</span>
              )}
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

      <Button onClick={handleApplyFilters}>Aplicar filtros</Button>
    </div>
  );
}
