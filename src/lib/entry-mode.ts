import { DateTime } from "luxon";

import { TIMEZONE } from "./constants";

export type EntryMode = "REGULAR" | "ON_CALL" | "EMERGENCY";

export type EntrySchedule = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

function minuteOfDay(date: Date) {
  const local = DateTime.fromJSDate(date).setZone(TIMEZONE);
  return local.hour * 60 + local.minute;
}

export function isWithinWorkSchedule(date: Date, schedule: EntrySchedule) {
  const current = minuteOfDay(date);
  const start = schedule.startHour * 60 + schedule.startMinute;
  const end = schedule.endHour * 60 + schedule.endMinute;

  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export function classifyEntryMode(
  timestamp: Date,
  hasOnCallSchedule: boolean,
  schedule: EntrySchedule,
): EntryMode {
  if (hasOnCallSchedule) return "ON_CALL";
  return isWithinWorkSchedule(timestamp, schedule) ? "REGULAR" : "EMERGENCY";
}
