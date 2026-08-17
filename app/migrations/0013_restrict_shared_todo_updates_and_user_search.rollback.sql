-- WowToDo Rollback Migration
-- Rollback Number: 0013
-- Reverts Migration Number: 0013
-- Reverts Migration Identifier: 0013_restrict_shared_todo_updates_and_user_search
-- Title: Restrict share-recipient todo updates and close the user-search email oracle
-- Preconditions:
--   Safe to run at any time. Requires migrations 0006 and 0008 to still be applied,
--   since this restores the 0008 definition of search_users.
-- Data Preservation: nothing to preserve. Migration 0013 reads and writes no table data;
--                    it only installs an authorisation trigger and redefines a function.
--                    No backup or archive step is required.
-- Data Loss Risk: none.
--
--   ⚠️ SECURITY WARNING — this rollback deliberately REOPENS two known vulnerabilities:
--      F1 (P0) a share recipient can rewrite and seize ownership of the owner's todo;
--      F5 (P1) any authenticated user can harvest every registered user's email address.
--   Only run this to unblock a production incident, and re-apply 0013 as soon as the
--   incident is resolved.
--
-- Forward Migration File: migrations/0013_restrict_shared_todo_updates_and_user_search.sql
-- Post-Rollback Verification:
--   1. Trigger absent:  select count(*) from pg_trigger
--                       where tgname = 'enforce_shared_todo_update_scope';   -- expect 0
--   2. search_users returns the email column populated for name matches again.
--   3. Application sharing flows still function (accept, toggle completion, revoke).
-- Author/Agent: Claude Opus 5 (prompt pack WOWTODO_REVIVAL_V1, release plan slice 1)
-- Created: 2026-08-17

-- ─────────────────────────────────────────────────────────────────────────────
-- Revert F1 — remove the column-level restriction on recipient updates
-- ─────────────────────────────────────────────────────────────────────────────
-- The "Recipient toggles todo completion" RLS policy is left untouched: migration 0013
-- narrowed behaviour with a trigger and did not modify the policy, so nothing to restore.

drop trigger if exists enforce_shared_todo_update_scope on public.todos;
drop function if exists public.enforce_shared_todo_update_scope();

-- ─────────────────────────────────────────────────────────────────────────────
-- Revert F5 — restore the migration 0008 definition of search_users verbatim
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.search_users(search_query text)
returns table(user_id uuid, full_name text, avatar_url text, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    au.id as user_id,
    up.full_name,
    up.avatar_url,
    au.email::text
  from auth.users au
  left join public.user_profiles up on up.user_id = au.id
  where
    au.id != auth.uid()
    and (
      up.full_name ilike '%' || search_query || '%'
      or au.email ilike '%' || search_query || '%'
    )
  limit 20;
end;
$$;

comment on function public.search_users(text) is null;
