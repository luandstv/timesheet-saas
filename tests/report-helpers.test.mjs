import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReportPeriodLabel,
  getValidatedReportQuery,
} from "../src/lib/reports/report-helpers.ts";
import { reportQuerySchema } from "../src/schemas/report.schema.ts";

test("usa o primeiro valor quando a URL contém parâmetros repetidos", () => {
  assert.deepEqual(
    getValidatedReportQuery({
      startDate: ["2026-09-01", "2026-09-02"],
      endDate: ["2026-09-30", "2026-10-01"],
    }),
    { startDate: "2026-09-01", endDate: "2026-09-30" },
  );
});

test("formata o intervalo do relatório para o usuário", () => {
  assert.equal(
    formatReportPeriodLabel("2026-09-01", "2026-09-30"),
    "01/09/2026 - 30/09/2026",
  );
});

test("associa intervalo invertido ao campo inicial", () => {
  const result = reportQuerySchema.safeParse({
    startDate: "2026-09-30",
    endDate: "2026-09-01",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0].path[0], "startDate");
  }
});
