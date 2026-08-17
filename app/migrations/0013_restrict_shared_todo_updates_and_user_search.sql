-- WowToDo Forward Migration
-- Migration Number: 0013
-- Migration Identifier: 0013_restrict_shared_todo_updates_and_user_search
-- Title: Restrict share-recipient todo updates and close the user-search email oracle
-- Purpose: Fixes audit findings F1 (P0) and F5 (P1) from prompt 120.
--          F1 — the `todos` recipient UPDATE policy constrains *who* may update but not
--               *which columns*, and its WITH CHECK does not pin `user_id`. A share
--               recipient could rewrite the owner's todo title and reassign `user_id` to
--               themselves; afterwards the owner saw 0 rows and the recipient saw 1.
--          F5 — `search_users` is SECURITY DEFINER, reads auth.users, matches
--               ILIKE '%q%' on name AND email, and returns email. A brand-new account
--               searching "@" harvested every registered user's email address.
-- Depends On: 0006 (sharing), 0008 (search_users LEFT JOIN fix)
-- Affected Objects:
--   CREATE FUNCTION public.enforce_shared_todo_update_scope()
--   CREATE TRIGGER  enforce_shared_todo_update_scope ON public.todos
--   REPLACE FUNCTION public.search_users(text)
-- Data Risk: none. No table data is read, written, transformed or deleted. This migration
--            only adds an authorisation check and narrows a search function's output.
--            Existing rows are untouched.
-- Rollback File: migrations/0013_restrict_shared_todo_updates_and_user_search.rollback.sql
-- Pre-Deployment Checks:
--   1. `npm run db:reset:local` applies cleanly through 0012.
--   2. Confirm the recipient UPDATE policy still exists (this migration narrows it,
--      it does not replace it).
-- Post-Deployment Verification:
--   1. Recipient PATCH {"completed":true}  -> 204 (still allowed)
--   2. Recipient PATCH {"title":"x"}       -> 403
--   3. Recipient PATCH {"user_id":"<self>"}-> 403
--   4. Owner PATCH any column              -> 204
--   5. search_users('@')                   -> [] (no harvest)
--   6. search_users('<exact email>')       -> that user, with email
--   7. search_users('<name substring>')    -> match with email NULL
-- Author/Agent: Claude Opus 5 (prompt pack WOWTODO_REVIVAL_V1, release plan slice 1)
-- Created: 2026-08-17

-- ─────────────────────────────────────────────────────────────────────────────
-- F1 — restrict share-recipient updates to the completion flag
-- ─────────────────────────────────────────────────────────────────────────────
--
-- RLS policies cannot express column-level restrictions, so the policy stays as the
-- row-level gate ("is this todo shared with me?") and this trigger adds the column-level
-- gate ("may I change this particular field?").
--
-- The comparison is done on the whole row via to_jsonb minus the allowed keys rather than
-- by enumerating columns. Enumerating is fragile: a column added by a later migration
-- would silently become writable by recipients again. This form protects new columns by
-- default.

create or replace function public.enforce_shared_todo_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- The owner of the row may change anything.
    if auth.uid() = old.user_id then
        return new;
    end if;

    -- Anyone else reaching this trigger is a share recipient (the RLS policy has
    -- already established the row is shared with them). They may only toggle
    -- `completed`; `updated_at` is maintained by the handle_updated_at trigger.
    if (to_jsonb(new) - 'completed' - 'updated_at')
       is distinct from
       (to_jsonb(old) - 'completed' - 'updated_at')
    then
        raise exception
            'Share recipients may only change completion status on a shared todo'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

comment on function public.enforce_shared_todo_update_scope() is
    'Migration 0013 / finding F1. Column-level companion to the "Recipient toggles todo '
    'completion" RLS policy: recipients may change only `completed`. Owners are unaffected.';

drop trigger if exists enforce_shared_todo_update_scope on public.todos;

create trigger enforce_shared_todo_update_scope
    before update on public.todos
    for each row
    execute function public.enforce_shared_todo_update_scope();

-- ─────────────────────────────────────────────────────────────────────────────
-- F5 — close the user-search email oracle
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Sharing is person-to-person and the UI offers "Search by name or email", so both
-- lookups are preserved:
--
--   * exact email match (case-insensitive) — returns the email, because the caller
--     already knows it; this cannot be used to discover anything new;
--   * name substring match — returns the profile but NOT the email address.
--
-- Shares are created with `recipient_id`, never `recipient_email`, so withholding the
-- address does not affect the sharing flow.
--
-- A minimum query length is enforced server-side. The client already requires 2
-- characters, but the client is not a security boundary.

create or replace function public.search_users(search_query text)
returns table(user_id uuid, full_name text, avatar_url text, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_query text := btrim(coalesce(search_query, ''));
begin
    -- Too short to be a deliberate lookup; refuse rather than return a broad slice.
    if char_length(v_query) < 3 then
        return;
    end if;

    -- Exact email match: the caller already possesses this address.
    if v_query like '%@%' then
        return query
        select au.id, up.full_name, up.avatar_url, au.email::text
        from auth.users au
        left join public.user_profiles up on up.user_id = au.id
        where au.id <> auth.uid()
          and lower(au.email) = lower(v_query)
        limit 1;
        return;
    end if;

    -- Name search: profile only. Email is deliberately NULL so that name enumeration
    -- cannot be escalated into address harvesting.
    return query
    select up.user_id, up.full_name, up.avatar_url, null::text
    from public.user_profiles up
    where up.user_id <> auth.uid()
      and up.full_name ilike '%' || v_query || '%'
    limit 20;
end;
$$;

comment on function public.search_users(text) is
    'Migration 0013 / finding F5. Exact-email lookup returns the address; name search '
    'never does. Minimum 3 characters. Prevents enumeration of the user base by email.';
