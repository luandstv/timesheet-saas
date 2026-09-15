import assert from "node:assert/strict";
import { register } from "node:module";
import test, { afterEach, beforeEach } from "node:test";
import { Settings } from "luxon";

const prisma = {};
globalThis.__timeEntryTestPrisma = prisma;
register(new URL("./fixtures/time-entry-loader.mjs", import.meta.url));
const { TimeEntryService } = await import("../src/services/time-entry.service.ts");

let sheets;
let entries;
let creates;
let upserts;
let updates;
let transactionTail;
const realNow = Settings.now;

function sheet(id, userId, date, status = "OPEN") {
  return {
    id,
    userId,
    date: new Date(`${date}T00:00:00.000Z`),
    status,
    isWeekend: false,
    isHoliday: false,
    totalWorkedMinutes: 0,
  };
}

function entry(id, timeSheetId, type, timestamp, requestId) {
  return {
    id,
    timeSheetId,
    type,
    timestamp: new Date(timestamp),
    createdAt: new Date(timestamp),
    entryMode: "REGULAR",
    requestId,
  };
}

function filterEntries(where = {}) {
  return entries.filter((item) => {
    const owner = sheets.find((value) => value.id === item.timeSheetId);
    return (
      (!where.timesheet || owner?.userId === where.timesheet.userId) &&
      (!where.timeSheetId || item.timeSheetId === where.timeSheetId) &&
      (!where.requestId || item.requestId === where.requestId) &&
      (!where.timestamp?.gte || item.timestamp >= where.timestamp.gte) &&
      (!where.timestamp?.lt || item.timestamp < where.timestamp.lt)
    );
  });
}

beforeEach(() => {
  Settings.now = () => Date.parse("2026-09-15T00:30:00-03:00");
  sheets = [];
  entries = [];
  creates = [];
  upserts = [];
  updates = [];
  transactionTail = Promise.resolve();

  Object.assign(prisma, {
    async $queryRaw() {
      return [];
    },
    async $transaction(callback) {
      const previous = transactionTail;
      let release;
      transactionTail = new Promise((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await callback(prisma);
      } finally {
        release();
      }
    },
    timeEntry: {
      async findMany({ where }) {
        return filterEntries(where).sort((a, b) => b.timestamp - a.timestamp);
      },
      async findFirst({ where, include }) {
        const found = filterEntries(where).sort(
          (a, b) => b.timestamp - a.timestamp,
        )[0];
        if (!found) return null;
        return {
          ...found,
          ...(include?.timesheet && {
            timesheet: sheets.find((value) => value.id === found.timeSheetId),
          }),
        };
      },
      async create({ data }) {
        if (data.requestId && entries.some((item) => item.requestId === data.requestId)) {
          const error = new Error("Unique constraint failed");
          error.code = "P2002";
          throw error;
        }
        creates.push(data);
        const value = entry(
          `created-${creates.length}`,
          data.timeSheetId,
          data.type,
          data.timestamp,
          data.requestId,
        );
        entries.push(value);
        return value;
      },
    },
    timesheet: {
      async upsert({ where, create }) {
        upserts.push(create);
        const key = where.userId_date;
        let value = sheets.find(
          (item) => item.userId === key.userId && +item.date === +key.date,
        );
        if (!value) {
          value = { id: `sheet-${sheets.length + 1}`, status: "OPEN", ...create };
          sheets.push(value);
        }
        return value;
      },
      async findUnique({ where, include }) {
        const value = sheets.find((item) => item.id === where.id);
        if (!value) return null;
        return {
          ...value,
          ...(include?.entries && {
            entries: entries.filter((item) => item.timeSheetId === value.id),
          }),
        };
      },
      async update({ where, data }) {
        updates.push({ id: where.id, ...data });
        const value = sheets.find((item) => item.id === where.id);
        Object.assign(value, data);
        return value;
      },
    },
    holiday: { async findFirst() { return null; } },
    user: {
      async findUnique() {
        return {
          dailyHours: 8,
          workStartHour: 8,
          workStartMinute: 0,
          workEndHour: 17,
          workEndMinute: 0,
        };
      },
    },
  });
});

afterEach(() => {
  Settings.now = realNow;
});

test("entrada de ontem mantém o estado trabalhando depois da meia-noite", async () => {
  sheets.push(sheet("yesterday", "user-a", "2026-09-14"));
  entries.push(entry("in", "yesterday", "CLOCK_IN", "2026-09-14T23:30:00-03:00"));

  const state = await TimeEntryService.getClockState("user-a");

  assert.equal(state.nextEntryType, "CLOCK_OUT");
  assert.equal(state.lastEntry.timeSheetId, "yesterday");
  assert.equal(upserts.length, 0);
});

test("saída após meia-noite fecha e recalcula a jornada de origem sem criar outra", async () => {
  sheets.push(sheet("yesterday", "user-a", "2026-09-14"));
  entries.push(entry("in", "yesterday", "CLOCK_IN", "2026-09-14T23:30:00-03:00"));

  const result = await TimeEntryService.clockIn("user-a");

  assert.equal(result.type, "CLOCK_OUT");
  assert.equal(result.entry.timeSheetId, "yesterday");
  assert.equal(result.entry.timestamp.toISOString(), "2026-09-15T03:30:00.000Z");
  assert.equal(upserts.length, 0);
  assert.equal(sheets.length, 1);
  assert.equal(updates[0].id, "yesterday");
  assert.equal(updates[0].totalWorkedMinutes, 60);
  assert.equal(updates[0].overtime75FhcnMinutes, 60);

  const next = await TimeEntryService.getClockState("user-a");
  assert.equal(next.nextEntryType, "CLOCK_IN");
});

test("nova entrada depois de encerrar a jornada anterior usa a data civil de hoje", async () => {
  sheets.push(sheet("yesterday", "user-a", "2026-09-14"));
  entries.push(entry("in", "yesterday", "CLOCK_IN", "2026-09-14T23:30:00-03:00"));
  await TimeEntryService.clockIn("user-a");
  Settings.now = () => Date.parse("2026-09-15T08:00:00-03:00");

  const result = await TimeEntryService.clockIn("user-a");

  assert.equal(result.type, "CLOCK_IN");
  assert.notEqual(result.timeSheet.id, "yesterday");
  assert.equal(result.timeSheet.date.toISOString(), "2026-09-15T00:00:00.000Z");
  assert.equal(sheets.length, 2);
});

test("usuário sem histórico abre ponto na data de São Paulo mesmo que UTC já seja amanhã", async () => {
  Settings.now = () => Date.parse("2026-09-15T02:30:00.000Z");

  assert.deepEqual(await TimeEntryService.getClockState("user-a"), {
    lastEntry: null,
    nextEntryType: "CLOCK_IN",
  });
  const result = await TimeEntryService.clockIn("user-a");

  assert.equal(result.type, "CLOCK_IN");
  assert.equal(result.timeSheet.date.toISOString(), "2026-09-14T00:00:00.000Z");
  assert.equal(result.entry.timestamp.toISOString(), "2026-09-15T02:30:00.000Z");
});

test("continua encerrando e apurando normalmente uma jornada no mesmo dia", async () => {
  Settings.now = () => Date.parse("2026-09-15T08:50:00-03:00");
  sheets.push(sheet("today", "user-a", "2026-09-15"));
  entries.push(entry("in", "today", "CLOCK_IN", "2026-09-15T08:00:00-03:00"));

  const result = await TimeEntryService.clockIn("user-a");

  assert.equal(result.type, "CLOCK_OUT");
  assert.equal(updates[0].totalWorkedMinutes, 50);
  assert.equal(updates[0].normalMinutes, 50);
});

test("repetir a mesma solicitação retorna o registro original sem duplicá-lo", async () => {
  Settings.now = () => Date.parse("2026-09-15T08:00:00-03:00");

  const first = await TimeEntryService.clockIn("user-a", "request-1");
  const repeated = await TimeEntryService.clockIn("user-a", "request-1");

  assert.equal(first.entry.id, repeated.entry.id);
  assert.equal(first.type, "CLOCK_IN");
  assert.equal(repeated.type, "CLOCK_IN");
  assert.equal(creates.length, 1);
  assert.equal(entries.length, 1);
});

test("serializa solicitações concorrentes e alterna o estado uma única vez", async () => {
  Settings.now = () => Date.parse("2026-09-15T08:00:00-03:00");

  const [first, second] = await Promise.all([
    TimeEntryService.clockIn("user-a", "request-1"),
    TimeEntryService.clockIn("user-a", "request-2"),
  ]);

  assert.equal(first.type, "CLOCK_IN");
  assert.equal(second.type, "CLOCK_OUT");
  assert.equal(creates.length, 2);
  assert.equal(entries.length, 2);
});

test("permite vários pares legítimos na mesma jornada", async () => {
  Settings.now = () => Date.parse("2026-09-15T08:00:00-03:00");
  const first = await TimeEntryService.clockIn("user-a", "request-1");

  Settings.now = () => Date.parse("2026-09-15T09:00:00-03:00");
  const second = await TimeEntryService.clockIn("user-a", "request-2");

  Settings.now = () => Date.parse("2026-09-15T22:00:00-03:00");
  const third = await TimeEntryService.clockIn("user-a", "request-3");

  Settings.now = () => Date.parse("2026-09-15T23:00:00-03:00");
  const fourth = await TimeEntryService.clockIn("user-a", "request-4");

  assert.equal(first.type, "CLOCK_IN");
  assert.equal(second.type, "CLOCK_OUT");
  assert.equal(third.type, "CLOCK_IN");
  assert.equal(fourth.type, "CLOCK_OUT");
  assert.equal(creates.length, 4);
  assert.equal(new Set(entries.map((value) => value.requestId)).size, 4);
});

test("último movimento de outra conta não altera nem encerra a jornada do usuário", async () => {
  sheets.push(
    sheet("a", "user-a", "2026-09-14"),
    sheet("b", "user-b", "2026-09-15"),
  );
  entries.push(
    entry("a-in", "a", "CLOCK_IN", "2026-09-14T23:30:00-03:00"),
    entry("b-out", "b", "CLOCK_OUT", "2026-09-15T00:20:00-03:00"),
  );

  const result = await TimeEntryService.clockIn("user-a");

  assert.equal(result.type, "CLOCK_OUT");
  assert.equal(result.entry.timeSheetId, "a");
  assert.deepEqual(updates.map((value) => value.id), ["a"]);
  assert.equal(creates.length, 1);
});

test("uma jornada aprovada não aceita saída nem recálculo automático", async () => {
  sheets.push(sheet("approved", "user-a", "2026-09-14", "APPROVED"));
  entries.push(entry("in", "approved", "CLOCK_IN", "2026-09-14T23:30:00-03:00"));

  await assert.rejects(() => TimeEntryService.clockIn("user-a"), /bloqueada/);

  assert.equal(creates.length, 0);
  assert.equal(updates.length, 0);
  assert.equal(upserts.length, 0);
});

test("histórico de hoje inclui saída da folha de ontem e respeita dia brasileiro e usuário", async () => {
  sheets.push(
    sheet("yesterday", "user-a", "2026-09-14"),
    sheet("today", "user-a", "2026-09-15"),
    sheet("tomorrow", "user-a", "2026-09-16"),
    sheet("other", "user-b", "2026-09-15"),
  );
  entries.push(
    entry("yesterday-in", "yesterday", "CLOCK_IN", "2026-09-14T23:59:00-03:00"),
    entry("today-out", "yesterday", "CLOCK_OUT", "2026-09-15T00:00:00-03:00"),
    entry("today-in", "today", "CLOCK_IN", "2026-09-15T08:00:00-03:00"),
    entry("tomorrow-in", "tomorrow", "CLOCK_IN", "2026-09-16T00:00:00-03:00"),
    entry("other-in", "other", "CLOCK_IN", "2026-09-15T00:10:00-03:00"),
  );

  const result = await TimeEntryService.getTodayMovements("user-a");

  assert.deepEqual(result.map((value) => value.id), ["today-in", "today-out"]);
});
