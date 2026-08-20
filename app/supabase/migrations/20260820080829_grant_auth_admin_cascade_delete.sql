-- ============================================================================
-- 0016 — let GoTrue's role complete the ON DELETE CASCADE from auth.users
--
-- Required by D1 (in-app account deletion, a Google Play blocker). Without this
-- migration, deleting an account fails outright:
--
--   GoTrue:    {"code":500,"error_code":"unexpected_failure",
--               "msg":"Database error deleting user"}
--   Postgres:  supabase_auth_admin@postgres ERROR: permission denied for table tasks
--
-- WHY IT FAILS
-- Every table holding user data declares `references auth.users(id) on delete
-- cascade`. When the admin API deletes the auth row, Postgres runs those cascade
-- deletes through the referential-integrity trigger on `auth.users` — which
-- executes as that table's owner, `supabase_auth_admin`. That role is granted
-- nothing at all in `public` (verified: zero rows in role_table_grants, locally
-- AND in the cloud project), so the very first cascade is denied and the whole
-- delete is rolled back.
--
-- This is not a local-only artefact. The cloud schema dump contains no
-- `supabase_auth_admin` grant either, so account deletion would have returned a
-- 500 in production exactly as it did locally.
--
-- WHY GRANT *SELECT* TOO
-- The cascade is a `DELETE ... WHERE <fk column> = ...`, and Postgres requires
-- SELECT on the columns a DELETE reads in its WHERE clause. DELETE alone is not
-- enough.
--
-- RLS IS NOT AN OBSTACLE
-- These tables have RLS enabled with `auth.uid() = user_id` policies, under which
-- supabase_auth_admin would match no rows. Referential-integrity actions run with
-- row security suppressed, so the cascade deletes every row rather than silently
-- deleting none. Asserted end-to-end by `npm run verify:account-deletion`, which
-- fails loudly if any row survives.
--
-- SCOPE
-- SELECT and DELETE only — never INSERT or UPDATE. This role must be able to
-- remove a departing user's rows and nothing else. It already reads far more
-- sensitive data (every email and identity) in the `auth` schema.
--
-- Rollback: migrations/rollbacks/0016_grant_auth_admin_cascade_delete.rollback.sql
-- ============================================================================

-- Already true on both stacks; stated so the grants below cannot depend on it
-- having been set elsewhere.
grant usage on schema public to supabase_auth_admin;

-- The nine tables that reference auth.users. Listed explicitly rather than as
-- ON ALL TABLES so that this file also documents which tables an account
-- deletion is expected to reach.
grant select, delete on table
    public.tasks,
    public.todos,
    public.task_groups,
    public.user_profiles,
    public.reminder_settings,
    public.scheduled_reminders,
    public.shares,
    public.in_app_notifications,
    public.ai_usage_quota
to supabase_auth_admin;

-- Safety net for tables added later. A new table with a cascading user_id but no
-- grant would not error in any test suite except verify:account-deletion — it
-- would just quietly break account deletion again, and turn a compliance promise
-- into a false one. Migrations run as `postgres`, so this covers anything a
-- future migration creates.
alter default privileges for role postgres in schema public
    grant select, delete on tables to supabase_auth_admin;
