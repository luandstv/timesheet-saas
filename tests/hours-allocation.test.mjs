import assert from "node:assert/strict";
import test from "node:test";
import {
  formatHoursInput,
  parseHoursInput,
  splitContractedMinutes,
} from "../src/lib/hours-allocation.ts";

test("distribui 500 horas entre 11 pessoas sem dízimas e preserva o total", () => {
  const allocations = splitContractedMinutes(500 * 60, 11);

  assert.deepEqual(allocations, [
    46 * 60,
    46 * 60,
    46 * 60,
    46 * 60,
    46 * 60,
    45 * 60,
    45 * 60,
    45 * 60,
    45 * 60,
    45 * 60,
    45 * 60,
  ]);
  assert.equal(
    allocations.reduce((sum, value) => sum + value, 0),
    500 * 60,
  );
});

test("mantém minutos residuais do contrato em uma única meta", () => {
  const allocations = splitContractedMinutes(10 * 60 + 30, 3);

  assert.deepEqual(allocations, [4 * 60, 3 * 60, 3 * 60 + 30]);
  assert.equal(
    allocations.reduce((sum, value) => sum + value, 0),
    630,
  );
});

test("limita a edição a duas casas e mantém a precisão de um minuto", () => {
  assert.equal(formatHoursInput(45 * 60 + 28), "45.47");
  assert.equal(parseHoursInput(formatHoursInput(45 * 60 + 28)), 45 * 60 + 28);
  assert.equal(parseHoursInput("45,47"), 45 * 60 + 28);
  assert.equal(parseHoursInput("45.466"), null);
  assert.equal(parseHoursInput("-1"), null);
});
