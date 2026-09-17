import assert from "node:assert/strict";
import test from "node:test";
import { formatMinutesToCompact, formatMinutesToHours } from "../src/lib/format.ts";

test("formata minutos para leitura humana", () => {
  assert.equal(formatMinutesToHours(0), "0h 00min");
  assert.equal(formatMinutesToHours(50), "50min");
  assert.equal(formatMinutesToHours(60), "1h");
  assert.equal(formatMinutesToHours(90), "1h 30min");
});

test("formata minutos no padrão compacto de relatório", () => {
  assert.equal(formatMinutesToCompact(0), "00:00");
  assert.equal(formatMinutesToCompact(50), "0:50");
  assert.equal(formatMinutesToCompact(90), "1:30");
});
