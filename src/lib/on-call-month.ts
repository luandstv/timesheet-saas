import { DateTime } from "luxon";

import { TIMEZONE } from "@/lib/constants";

export function resolveOnCallMonth(value?: string) {
  const now = DateTime.now().setZone(TIMEZONE);
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return now.toFormat("yyyy-MM");

  const parsed = DateTime.fromISO(`${value}-01`, { zone: TIMEZONE });
  return parsed.isValid && parsed.toFormat("yyyy-MM") === value
    ? value
    : now.toFormat("yyyy-MM");
}
