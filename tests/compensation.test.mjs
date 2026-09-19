import test from "node:test";
import assert from "node:assert/strict";

import { calculateCompensation } from "../src/lib/compensation.ts";

test("calcula extras, sobreaviso e DSR sobre uma hora de R$ 10", () => {
  const result = calculateCompensation({
    baseSalary: 2200,
    monthlyHours: 220,
    overtime75Minutes: 120,
    overtime100Minutes: 60,
    onCallMinutes: 900,
    workDays: 25,
    restDays: 5,
  });

  assert.equal(result.hourlyRate, 10);
  assert.equal(result.overtimeValue, 55);
  assert.equal(result.onCallValue, 50);
  assert.equal(result.dsrValue, 21);
  assert.equal(result.variableValue, 105);
  assert.equal(result.estimatedGrossValue, 2326);
});

test("não gera DSR quando não há dias úteis no período", () => {
  const result = calculateCompensation({
    baseSalary: 2200,
    monthlyHours: 220,
    overtime75Minutes: 120,
    overtime100Minutes: 0,
    onCallMinutes: 0,
    workDays: 0,
    restDays: 2,
  });

  assert.equal(result.dsrValue, 0);
});
