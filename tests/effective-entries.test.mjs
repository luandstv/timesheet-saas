import assert from "node:assert/strict";
import test from "node:test";
import { effectiveEntries, validateMovements } from "../src/lib/effective-entries.ts";
import { TimeCalculationService } from "../src/services/time-calculation.service.ts";

const at = (hour) => new Date(`2026-09-14T${hour}:00-03:00`);
const event = (id, type, hour, timeSheetId = "sheet") => ({
  id,
  type,
  timestamp: at(hour),
  timeSheetId,
  entryMode: "REGULAR",
});
const raw = () => [
  event("in", "CLOCK_IN", "13:00"),
  event("out", "CLOCK_OUT", "14:20"),
];
const request = (extra = {}) => ({
  id: "request",
  timeSheetId: "sheet",
  targetEventId: "out",
  type: "MODIFICATION",
  entryType: "CLOCK_OUT",
  newTimestamp: at("14:00"),
  status: "APPROVED",
  provisional: false,
  sequence: 1,
  ...extra,
});

test("saída corrigida de 14:20 para 14:00 recalcula sem alterar originais", () => {
  const source = raw();
  const entries = effectiveEntries(source, [request()]);
  assert.equal(source[1].timestamp.getTime(), at("14:20").getTime());
  assert.equal(entries[1].timestamp.getTime(), at("14:00").getTime());
  const totals = TimeCalculationService.calculateDay(entries, 8, false, false, {
    startHour: 8,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
  });
  assert.equal(totals.totalWorkedMinutes, 60);
});
test("pendentes comuns e rejeitados não afetam totais; cancelamento reverte provisório", () => {
  for (const status of ["PENDING", "REJECTED", "CANCELLED"]) {
    assert.equal(
      +effectiveEntries(raw(), [request({ status })])[1].timestamp,
      +at("14:20"),
    );
  }
  const provisional = effectiveEntries(raw(), [
    request({ status: "PENDING", provisional: true }),
  ]);
  assert.equal(+provisional[1].timestamp, +at("14:00"));
  assert.equal(provisional[1].provisional, true);
  for (const status of ["CANCELLED", "REJECTED"])
    assert.equal(
      +effectiveEntries(raw(), [request({ status, provisional: true })])[1].timestamp,
      +at("14:20"),
    );
});
test("inclusão aprovada recebe identidade estável e permite correção posterior", () => {
  const insert = request({
    id: "insert",
    type: "INSERTION",
    targetEventId: null,
    entryType: "CLOCK_IN",
    newTimestamp: at("08:00"),
  });
  const modified = request({
    targetEventId: "insert",
    newTimestamp: at("08:30"),
    entryType: "CLOCK_IN",
    sequence: 2,
  });
  const entries = effectiveEntries([], [modified, insert]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, "insert");
  assert.equal(+entries[0].timestamp, +at("08:30"));
});
test("exclusão efetiva preserva raw e sequência não aceita par incompleto no meio", () => {
  const source = raw();
  const entries = effectiveEntries(source, [
    request({ type: "DELETION", targetEventId: "in", newTimestamp: null }),
  ]);
  assert.equal(source.length, 2);
  assert.throws(() => validateMovements(entries), /saída precisa/);
});
test("múltiplos acionamentos e virada de dia são aceitos na mesma jornada", () => {
  const entries = [
    ...raw(),
    event("night-in", "CLOCK_IN", "23:00"),
    {
      ...event("night-out", "CLOCK_OUT", "23:59"),
      timestamp: new Date("2026-09-15T01:00:00-03:00"),
    },
  ];
  assert.doesNotThrow(() => validateMovements(entries));
});
test("não permite sobreposição entre espaços, saída em outra jornada, empate ou futuro", () => {
  assert.throws(
    () =>
      validateMovements([
        event("a", "CLOCK_IN", "08:00"),
        event("b", "CLOCK_IN", "09:00", "another"),
      ]),
    /entrada sem saída/,
  );
  assert.throws(
    () =>
      validateMovements([
        event("a", "CLOCK_IN", "08:00"),
        event("b", "CLOCK_OUT", "09:00", "another"),
      ]),
    /mesma jornada/,
  );
  assert.throws(
    () =>
      validateMovements([
        event("a", "CLOCK_IN", "08:00"),
        event("b", "CLOCK_OUT", "08:00"),
      ]),
    /distintos/,
  );
  assert.throws(() => validateMovements(raw(), at("13:30")), /futuro/);
});
