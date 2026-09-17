import assert from "node:assert/strict";
import test from "node:test";
import { DateTime } from "luxon";
import { buildClockPresentation } from "../src/lib/clock-presentation.ts";

test("mantém a saída e identifica entrada pendente do dia anterior em São Paulo", () => {
  const result = buildClockPresentation(
    {
      nextEntryType: "CLOCK_OUT",
      lastEntry: { type: "CLOCK_IN", timestamp: new Date("2026-09-15T02:30:00Z") },
    },
    DateTime.fromISO("2026-09-15T03:30:00Z"),
  );
  assert.deepEqual(result, {
    nextType: "CLOCK_OUT",
    lastEntryTime: "23:30:00",
    lastEntryDate: "14/09/2026",
    hasPendingPreviousDay: true,
  });
});

test("a virada UTC não sinaliza outro dia enquanto ainda é o mesmo dia brasileiro", () => {
  const result = buildClockPresentation(
    {
      nextEntryType: "CLOCK_OUT",
      lastEntry: { type: "CLOCK_IN", timestamp: new Date("2026-09-14T23:30:00Z") },
    },
    DateTime.fromISO("2026-09-15T02:30:00Z"),
  );
  assert.equal(result.lastEntryTime, "20:30:00");
  assert.equal(result.lastEntryDate, null);
  assert.equal(result.hasPendingPreviousDay, false);
});

test("saída de ontem permite entrada e exibe a data sem alerta de pendência", () => {
  const result = buildClockPresentation(
    {
      nextEntryType: "CLOCK_IN",
      lastEntry: { type: "CLOCK_OUT", timestamp: new Date("2026-09-14T21:00:00Z") },
    },
    DateTime.fromISO("2026-09-15T12:00:00Z"),
  );
  assert.equal(result.nextType, "CLOCK_IN");
  assert.equal(result.lastEntryDate, "14/09/2026");
  assert.equal(result.hasPendingPreviousDay, false);
});

test("usuário sem movimentos pode registrar entrada sem inventar horário", () => {
  const result = buildClockPresentation(
    { nextEntryType: "CLOCK_IN", lastEntry: null },
    DateTime.fromISO("2026-09-15T12:00:00Z"),
  );
  assert.deepEqual(result, {
    nextType: "CLOCK_IN",
    lastEntryTime: null,
    lastEntryDate: null,
    hasPendingPreviousDay: false,
  });
});
