-- AUD-012: the application uses Supabase for Auth and Prisma on the server
-- for application data. Keep the public Data API closed to client roles.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'workspaces',
    'workspace_members',
    'workspace_invitations',
    'workspace_join_requests',
    'time_sheets',
    'time_entries',
    'time_entry_adjustments',
    'activities',
    'on_call_schedule',
    'user_salary_configs',
    'holidays',
    'absences',
    'adjustment_requests',
    'monthly_closures',
    'workspace_audit'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      table_name
    );
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
      table_name
    );
  END LOOP;
END
$$;

-- Prevent client roles from reaching serial/identity sequences directly.
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Keep future Prisma-created objects closed by default as well.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
