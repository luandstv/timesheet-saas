import assert from "node:assert/strict";
import test from "node:test";
import { TimeCalculationService } from "../src/services/time-calculation.service.ts";

const schedule = {
  startHour: 8,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
};

function timestamp(time) {
  return new Date(`2026-09-14T${time}-03:00`);
}

test("calcula os 50 minutos de um par de entrada e saída", () => {
  const result = TimeCalculationService.calculateDay(
    [
      { type: "CLOCK_OUT", timestamp: timestamp("16:49:05") },
      { type: "CLOCK_IN", timestamp: timestamp("15:59:35") },
    ],
    8,
    false,
    false,
    schedule,
  );

  assert.deepEqual(result, {
    totalWorkedMinutes: 50,
    normalMinutes: 50,
    overtime75FhcMinutes: 0,
    overtime75FhcnMinutes: 0,
    overtime100FhcMinutes: 0,
    overtime100FhcnMinutes: 0,
  });
});

test("limita a hora extra de 75% e envia o excedente para 100%", () => {
  const result = TimeCalculationService.calculateDay(
    [
      { type: "CLOCK_IN", timestamp: timestamp("08:00:00") },
      { type: "CLOCK_OUT", timestamp: timestamp("19:00:00") },
    ],
    8,
    false,
    false,
    schedule,
  );

  assert.equal(result.totalWorkedMinutes, 660);
  assert.equal(result.normalMinutes, 480);
  assert.equal(result.overtime75FhcMinutes, 120);
  assert.equal(result.overtime100FhcMinutes, 60);
});

test("classifica trabalho de fim de semana como hora extra de 100%", () => {
  const result = TimeCalculationService.calculateDay(
    [
      { type: "CLOCK_IN", timestamp: timestamp("10:00:00") },
      { type: "CLOCK_OUT", timestamp: timestamp("11:00:00") },
    ],
    8,
    true,
    false,
    schedule,
  );

  assert.equal(result.totalWorkedMinutes, 60);
  assert.equal(result.normalMinutes, 0);
  assert.equal(result.overtime100FhcMinutes, 60);
});

test("ignora entrada sem saída correspondente", () => {
  const result = TimeCalculationService.calculateDay(
    [{ type: "CLOCK_IN", timestamp: timestamp("08:00:00") }],
    8,
    false,
    false,
    schedule,
  );

  assert.equal(result.totalWorkedMinutes, 0);
});
