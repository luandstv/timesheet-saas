import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const protectedTables = [
  "_prisma_migrations",
  "users",
  "workspaces",
  "workspace_members",
  "workspace_invitations",
  "workspace_join_requests",
  "time_sheets",
  "time_entries",
  "time_entry_adjustments",
  "activities",
  "on_call_schedule",
  "user_salary_configs",
  "holidays",
  "absences",
  "adjustment_requests",
  "monthly_closures",
  "workspace_audit",
  "user_notifications",
];

const client = new Client({ connectionString: process.env.DIRECT_URL });

try {
  await client.connect();
  const { rows } = await client.query(
    `
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        has_table_privilege('anon', format('public.%I', c.relname), 'SELECT') AS anon_can_select,
        has_table_privilege('authenticated', format('public.%I', c.relname), 'SELECT') AS authenticated_can_select
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname = ANY($1::text[])
      ORDER BY c.relname
    `,
    [protectedTables],
  );

  console.table(rows);
  const missing = protectedTables.filter(
    (tableName) =>
      !rows.some(
        (row) =>
          row.table_name === tableName &&
          row.rls_enabled &&
          !row.anon_can_select &&
          !row.authenticated_can_select,
      ),
  );

  if (missing.length > 0) {
    throw new Error(`RLS verification failed: ${missing.join(", ")}`);
  }

  console.log(`RLS verified for ${protectedTables.length} protected tables.`);
} finally {
  await client.end().catch(() => undefined);
}
