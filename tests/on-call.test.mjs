import test from "node:test";
import assert from "node:assert/strict";

import { DateTime } from "luxon";

import { describeOnCallDay } from "../src/lib/on-call.ts";

const zone = "America/Sao_Paulo";

test("sobreaviso usa 15 horas em dia útil por padrão", () => {
  const date = DateTime.fromISO("2026-09-16", { zone });
  const result = describeOnCallDay(date, null, new Set());

  assert.equal(result.totalOnCallMinutes, 900);
  assert.equal(result.isWeekend, false);
  assert.equal(result.isHoliday, false);
  assert.equal(result.holidayMode, "auto");
});

test("sobreaviso usa 24 horas no fim de semana", () => {
  const date = DateTime.fromISO("2026-09-19", { zone });
  const result = describeOnCallDay(date, null, new Set());

  assert.equal(result.totalOnCallMinutes, 1440);
  assert.equal(result.isWeekend, true);
});

test("feriado automático e marcação manual usam 24 horas", () => {
  const date = DateTime.fromISO("2026-09-16", { zone });
  const automatic = describeOnCallDay(date, null, new Set(["2026-09-16"]));
  const manual = describeOnCallDay(date, true, new Set());

  assert.equal(automatic.totalOnCallMinutes, 1440);
  assert.equal(automatic.isHoliday, true);
  assert.equal(manual.totalOnCallMinutes, 1440);
  assert.equal(manual.holidayMode, "holiday");
});

test("uma marcação manual de dia útil não altera a regra de fim de semana", () => {
  const date = DateTime.fromISO("2026-09-19", { zone });
  const result = describeOnCallDay(date, false, new Set());

  assert.equal(result.totalOnCallMinutes, 1440);
  assert.equal(result.isWeekend, true);
  assert.equal(result.isHoliday, false);
  assert.equal(result.holidayMode, "workday");
});
