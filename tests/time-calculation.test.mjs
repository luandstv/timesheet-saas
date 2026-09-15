import assert from "node:assert/strict";
import test from "node:test";
import { DateTime } from "luxon";
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

for (const [extraMinutes, expected75, expected100] of [
  [60, 60, 0],
  [119, 119, 0],
  [120, 120, 0],
  [121, 120, 1],
  [180, 120, 60],
  [300, 120, 180],
]) {
  test(`${extraMinutes} minutos extras: ${expected75} a 75% e ${expected100} a 100%`, () => {
    const start = DateTime.fromISO("2026-09-14T17:00:00-03:00");
    const result = TimeCalculationService.calculateDay([
      { type: "CLOCK_IN", timestamp: start.toJSDate() },
      { type: "CLOCK_OUT", timestamp: start.plus({ minutes: extraMinutes }).toJSDate() },
    ], 8, false, false, schedule);

    assert.equal(result.normalMinutes, 0);
    assert.equal(result.totalWorkedMinutes, extraMinutes);
    assert.equal(result.overtime75FhcMinutes + result.overtime75FhcnMinutes, expected75);
    assert.equal(result.overtime100FhcMinutes + result.overtime100FhcnMinutes, expected100);
  });
}

test("13 horas trabalhadas com limite normal de 8 geram 2 extras a 75% e 3 a 100%", () => {
  const result = TimeCalculationService.calculateDay([
    { type: "CLOCK_IN", timestamp: timestamp("08:00:00") },
    { type: "CLOCK_OUT", timestamp: timestamp("21:00:00") },
  ], 8, false, false, schedule);

  assert.deepEqual(result, {
    totalWorkedMinutes: 780,
    normalMinutes: 480,
    overtime75FhcMinutes: 120,
    overtime75FhcnMinutes: 0,
    overtime100FhcMinutes: 180,
    overtime100FhcnMinutes: 0,
  });
});

test("o limite de 2 horas é compartilhado por todas as entradas e saídas da jornada", () => {
  const result = TimeCalculationService.calculateDay([
    { type: "CLOCK_IN", timestamp: timestamp("06:30:00") },
    { type: "CLOCK_OUT", timestamp: timestamp("12:00:00") },
    { type: "CLOCK_IN", timestamp: timestamp("13:00:00") },
    { type: "CLOCK_OUT", timestamp: timestamp("20:30:00") },
  ], 8, false, false, schedule);

  assert.equal(result.totalWorkedMinutes, 780);
  assert.equal(result.normalMinutes, 480);
  assert.equal(result.overtime75FhcMinutes, 120);
  assert.equal(result.overtime100FhcMinutes, 180);
});

test("a mudança de FHC para FHCN não reinicia o limite de 75%", () => {
  const result = TimeCalculationService.calculateDay([
    { type: "CLOCK_IN", timestamp: timestamp("21:00:00") },
    { type: "CLOCK_OUT", timestamp: timestamp("23:30:00") },
  ], 8, false, false, schedule);

  assert.equal(result.totalWorkedMinutes, 150);
  assert.equal(result.overtime75FhcMinutes, 60);
  assert.equal(result.overtime75FhcnMinutes, 60);
  assert.equal(result.overtime100FhcMinutes, 0);
  assert.equal(result.overtime100FhcnMinutes, 30);
});

test("cada jornada apurada tem seu próprio limite de 2 horas a 75%", () => {
  const days = ["2026-09-14", "2026-09-15"].map((date) =>
    TimeCalculationService.calculateDay([
      { type: "CLOCK_IN", timestamp: new Date(`${date}T17:00:00-03:00`) },
      { type: "CLOCK_OUT", timestamp: new Date(`${date}T19:30:00-03:00`) },
    ], 8, false, false, schedule),
  );
  assert.equal(days.reduce((sum, day) => sum + day.overtime75FhcMinutes, 0), 240);
  assert.equal(days.reduce((sum, day) => sum + day.overtime100FhcMinutes, 0), 60);
});

test("a exceção de feriado classifica as 5 horas integralmente a 100%", () => {
  const result = TimeCalculationService.calculateDay([
    { type: "CLOCK_IN", timestamp: timestamp("17:00:00") },
    { type: "CLOCK_OUT", timestamp: timestamp("22:00:00") },
  ], 8, false, true, schedule);

  assert.equal(result.totalWorkedMinutes, 300);
  assert.equal(result.normalMinutes, 0);
  assert.equal(result.overtime75FhcMinutes + result.overtime75FhcnMinutes, 0);
  assert.equal(result.overtime100FhcMinutes + result.overtime100FhcnMinutes, 300);
});
