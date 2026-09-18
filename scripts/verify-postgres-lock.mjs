import "dotenv/config";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DIRECT_URL;
const holdMs = Number(process.env.LOCK_TEST_HOLD_MS ?? 250);

if (!connectionString) {
  throw new Error("DIRECT_URL is required to run the PostgreSQL lock verification.");
}

if (!Number.isFinite(holdMs) || holdMs < 100) {
  throw new Error("LOCK_TEST_HOLD_MS must be a number greater than or equal to 100.");
}

const first = new Client({ connectionString });
const second = new Client({ connectionString });
let firstInTransaction = false;
let secondInTransaction = false;

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  await Promise.all([first.connect(), second.connect()]);

  const { rows } = await first.query("SELECT id FROM public.users ORDER BY id LIMIT 1");
  const userId = rows[0]?.id;

  if (!userId) {
    throw new Error("No user exists in public.users for the lock verification.");
  }

  await first.query("BEGIN");
  firstInTransaction = true;
  await first.query("SELECT id FROM public.users WHERE id = $1::uuid FOR UPDATE", [
    userId,
  ]);

  await second.query("BEGIN");
  secondInTransaction = true;
  let secondLockResolved = false;
  const secondLock = second
    .query("SELECT id FROM public.users WHERE id = $1::uuid FOR UPDATE", [userId])
    .then((result) => {
      secondLockResolved = true;
      return result;
    });

  await sleep(holdMs);
  if (secondLockResolved) {
    throw new Error(
      "The second transaction acquired the row before the first transaction committed.",
    );
  }

  const startedAt = performance.now();
  await first.query("COMMIT");
  firstInTransaction = false;
  await secondLock;
  const waitedMs = Math.round(performance.now() - startedAt);

  await second.query("COMMIT");
  secondInTransaction = false;
  console.log(
    `PostgreSQL row lock verified: the second transaction waited ${waitedMs}ms after the first committed.`,
  );
} finally {
  if (firstInTransaction) await first.query("ROLLBACK").catch(() => undefined);
  if (secondInTransaction) await second.query("ROLLBACK").catch(() => undefined);
  await Promise.all([
    first.end().catch(() => undefined),
    second.end().catch(() => undefined),
  ]);
}
