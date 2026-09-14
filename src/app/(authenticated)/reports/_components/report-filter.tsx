"use client";

import { DateTime } from "luxon";
import { CalendarIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { TIMEZONE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <div className="grid gap-2">
          <label htmlFor="report-start-date" className="text-sm font-medium">Data inicial</label>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="report-start-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal md:w-60",
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
          <label htmlFor="report-end-date" className="text-sm font-medium">Data final</label>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="report-end-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal md:w-60",
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
      </CardContent>
    </Card>
  );
}
