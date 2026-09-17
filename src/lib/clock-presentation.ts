import { DateTime } from "luxon";
import { TIMEZONE } from "./constants";

export type ClockState = {
  lastEntry: {
    type: "CLOCK_IN" | "CLOCK_OUT";
    timestamp: Date;
    timesheet?: { workspaceId: string };
  } | null;
  nextEntryType: "CLOCK_IN" | "CLOCK_OUT";
};

/** O estado vem do histórico completo; o fuso só determina a apresentação. */
export function buildClockPresentation(state: ClockState, currentTime: DateTime) {
  const now = currentTime.setZone(TIMEZONE);
  const last = state.lastEntry
    ? DateTime.fromJSDate(state.lastEntry.timestamp).setZone(TIMEZONE)
    : null;
  const isPreviousDay = last !== null && last.startOf("day") < now.startOf("day");

  return {
    nextType: state.nextEntryType,
    lastEntryTime: last?.toFormat("HH:mm:ss") ?? null,
    lastEntryDate: isPreviousDay ? last.toFormat("dd/MM/yyyy") : null,
    hasPendingPreviousDay: isPreviousDay && state.nextEntryType === "CLOCK_OUT",
  };
}
