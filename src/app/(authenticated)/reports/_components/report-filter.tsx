"use client";

import { DateTime } from "luxon";
import { CalendarIcon, LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { TIMEZONE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingOverlay } from "@/components/shared/page-loading";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import {
  formatDateToDisplay,
  parseQueryDateToJSDate,
} from "@/lib/reports/report-helpers";

type ReportFilterProps = {
  startDate: string;
  endDate: string;
  scope?: "mine" | "team";
};

function formatDateToQueryValue(date: Date) {
  return DateTime.fromJSDate(date, { zone: TIMEZONE }).toFormat("yyyy-MM-dd");
}

export function ReportFilter({
  startDate,
  endDate,
  scope = "mine",
}: ReportFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [startDateValue, setStartDateValue] = useState<Date | undefined>(
    parseQueryDateToJSDate(startDate),
  );
  const [endDateValue, setEndDateValue] = useState<Date | undefined>(
    parseQueryDateToJSDate(endDate),
  );

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!startDateValue || !endDateValue) {
      return;
    }

    const params = new URLSearchParams();

    params.set("startDate", formatDateToQueryValue(startDateValue));
    params.set("endDate", formatDateToQueryValue(endDateValue));
    if (scope === "team") params.set("scope", scope);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <Card size="sm" className="rounded-[22px]">
      <CardContent className="p-5 sm:p-6">
        <form
          onSubmit={handleApplyFilters}
          className="flex flex-col gap-5 md:flex-row md:flex-wrap md:items-end"
        >
          <div className="grid gap-2">
            <Label htmlFor="report-start-date">Data inicial</Label>

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
            <Label htmlFor="report-end-date">Data final</Label>

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

          <Button type="submit" className="w-full md:w-auto" disabled={isPending}>
            {isPending && (
              <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
            )}
            {isPending ? "Atualizando…" : "Aplicar filtros"}
          </Button>
        </form>
      </CardContent>
      {isPending && <LoadingOverlay message="Atualizando relatório…" />}
    </Card>
  );
}
