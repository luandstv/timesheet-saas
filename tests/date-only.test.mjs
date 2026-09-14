import assert from "node:assert/strict";
import test from "node:test";
import { DateTime } from "luxon";
import {
  dateOnlyEnd,
  dateOnlyStart,
  formatDateOnly,
} from "../src/lib/date-only.ts";

test("preserva o dia brasileiro ao normalizar o início da data", () => {
  const localDate = DateTime.fromISO("2026-09-14T23:30:00", {
    zone: "America/Sao_Paulo",
  });

  assert.equal(
    dateOnlyStart(localDate).toISOString(),
    "2026-09-14T00:00:00.000Z",
  );
});

test("gera um intervalo inclusivo para uma coluna SQL DATE", () => {
  assert.equal(
    dateOnlyStart("2026-09-14").toISOString(),
    "2026-09-14T00:00:00.000Z",
  );
  assert.equal(
    dateOnlyEnd("2026-09-14").toISOString(),
    "2026-09-14T23:59:59.999Z",
  );
});

test("formata a data armazenada sem aplicar o fuso do servidor", () => {
  const databaseDate = new Date("2026-09-14T00:00:00.000Z");

  assert.equal(formatDateOnly(databaseDate), "2026-09-14");
});
