import { DateTime } from "luxon";

import { ON_CALL_WEEKDAY_MINUTES, ON_CALL_WEEKEND_MINUTES } from "./constants";

export type OnCallHolidayMode = "auto" | "holiday" | "workday";

export type OnCallDayDetails = {
  holidayMode: OnCallHolidayMode;
  isWeekend: boolean;
  isHoliday: boolean;
  totalOnCallMinutes: number;
};

export function describeOnCallDay(
  date: DateTime,
  holidayOverride: boolean | null,
  holidayDates: Set<string>,
): OnCallDayDetails {
  const dateKey = date.toFormat("yyyy-MM-dd");
  const isWeekend = date.weekday === 6 || date.weekday === 7;
  const isHoliday = holidayOverride ?? holidayDates.has(dateKey);

  return {
    isWeekend,
    isHoliday,
    totalOnCallMinutes:
      isWeekend || isHoliday ? ON_CALL_WEEKEND_MINUTES : ON_CALL_WEEKDAY_MINUTES,
    holidayMode:
      holidayOverride === null
        ? holidayDates.has(dateKey)
          ? "holiday"
          : "auto"
        : holidayOverride
          ? "holiday"
          : "workday",
  };
}
