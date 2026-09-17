import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

globalThis.__timeEntryTestPrisma = {};
register(new URL("./fixtures/time-entry-loader.mjs", import.meta.url));
const { validateTimeSheets } = await import("../src/services/adjustment.service.ts");

const at = (hour) => new Date(`2026-09-16T${hour}:00.000Z`);

function movement(id, timeSheetId, type, timestamp) {
  return {
    id,
    timeSheetId,
    type,
    timestamp,
    entryMode: "REGULAR",
  };
}

function database(raw) {
  return {
    timeEntry: {
      async findMany({ where }) {
        const ids = where.timeSheetId?.in;
        return ids ? raw.filter((entry) => ids.includes(entry.timeSheetId)) : raw;
      },
    },
    adjustmentRequest: {
      async findMany() {
        return [];
      },
    },
  };
}

test("ajuste válido não é bloqueado por conflito em outra jornada", async () => {
  const raw = [
    movement("current-in", "current", "CLOCK_IN", at("15:27")),
    movement("current-out", "current", "CLOCK_OUT", at("19:12")),
    movement("legacy-in", "legacy", "CLOCK_IN", at("08:00")),
    movement("legacy-in-2", "legacy", "CLOCK_IN", at("11:00")),
  ];

  await assert.doesNotReject(() =>
    validateTimeSheets(database(raw), "user", ["current"]),
  );
  await assert.rejects(
    () => validateTimeSheets(database(raw), "user", ["current", "legacy"]),
    /entrada sem saída/,
  );
});
