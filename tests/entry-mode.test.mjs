import test from "node:test";
import assert from "node:assert/strict";

import { classifyEntryMode, isWithinWorkSchedule } from "../src/lib/entry-mode.ts";

const schedule = {
  startHour: 8,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
};

function at(hour, minute = 0) {
  return new Date(
    `2026-09-21T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`,
  );
}

test("classifica ponto dentro do expediente como regular", () => {
  assert.equal(classifyEntryMode(at(9), false, schedule), "REGULAR");
});

test("classifica ponto escalado como sobreaviso", () => {
  assert.equal(classifyEntryMode(at(9), true, schedule), "ON_CALL");
});

test("classifica acionamento fora da escala como emergência", () => {
  assert.equal(classifyEntryMode(at(22), false, schedule), "EMERGENCY");
});

test("aceita jornada que atravessa a meia-noite", () => {
  const overnight = { startHour: 22, startMinute: 0, endHour: 6, endMinute: 0 };
  assert.equal(isWithinWorkSchedule(at(23), overnight), true);
  assert.equal(isWithinWorkSchedule(at(5), overnight), true);
  assert.equal(isWithinWorkSchedule(at(12), overnight), false);
});
