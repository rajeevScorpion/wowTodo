-- WowToDo Rollback Migration
-- Rolls Back: 0016_grant_auth_admin_cascade_delete
-- Forward File: supabase/migrations/20260820080829_grant_auth_admin_cascade_delete.sql
-- Title: Revoke supabase_auth_admin's cascade-delete privileges in public
-- Purpose: Reverses 0016 by revoking the SELECT/DELETE grants that let GoTrue's
--   role complete the ON DELETE CASCADE from auth.users.
-- Data Risk: NONE on execution — this grants and revokes privileges only, and
--   touches no row of user data.
--
--   ⚠ The risk is entirely in what this BREAKS. After this runs, in-app account
--   deletion stops working: the admin delete is denied on the first cascading
--   table and GoTrue returns
--       {"code":500,"error_code":"unexpected_failure",
--        "msg":"Database error deleting user"}
--   The app surfaces "Could not delete the account. Please try again.", and D1 —
--   a Google Play release blocker — is live again. There is no partial-deletion
--   failure mode: the transaction rolls back whole, so no account is left
--   half-deleted.
--
--   Do not run this to "clean up" grants. Run it only to reverse 0016
--   deliberately, and disable or remove the delete-account Edge Function at the
--   same time so users are not offered an action that cannot succeed.
-- Verification After Rollback:
--   1. select count(*) from information_schema.role_table_grants
--        where table_schema='public' and grantee='supabase_auth_admin';   -> 0
--   2. npm run verify:account-deletion   -> FAILS at "delete-account returns 200"
--      with HTTP 502 (this is the expected, correct result post-rollback)
-- Author/Agent: Claude Opus 5 (prompt pack WOWTODO_REVIVAL_V1, defect D1)
-- Created: 2026-08-20

alter default privileges for role postgres in schema public
    revoke select, delete on tables from supabase_auth_admin;

revoke select, delete on table
    public.tasks,
    public.todos,
    public.task_groups,
    public.user_profiles,
    public.reminder_settings,
    public.scheduled_reminders,
    public.shares,
    public.in_app_notifications,
    public.ai_usage_quota
from supabase_auth_admin;

-- USAGE on schema public is left in place: it predates 0016 (it is part of the
-- stock Supabase role setup, present on both stacks before this migration), so
-- revoking it here would remove something 0016 did not introduce.
