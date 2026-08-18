-- WowToDo Forward Migration
-- Migration Number: 0015
-- Migration Identifier: 0015_ai_proxy_rate_limit
-- Title: Per-user quota counters for the ai-proxy Edge Function
-- Purpose: Fixes audit finding F3 (P1). `ai-proxy` authenticates its callers and
--          restricts them to a model allow-list, but nothing bounds *how much* any
--          one caller may spend. Since the rotated provider keys were deployed to
--          production on 2026-08-18 this is a live cost exposure: any authenticated
--          user can call the function in a loop and bill the owner's OpenAI account.
--
--          Edge Functions are stateless and horizontally scaled, so an in-memory
--          counter would reset on every cold start and would not be shared between
--          isolates — it would bound nothing under exactly the burst it exists to
--          stop. The counter therefore lives in Postgres, which is the only piece of
--          shared state the function already has.
-- Depends On: 0001 (auth.users exists)
-- Affected Objects:
--   CREATE TABLE    public.ai_usage_quota
--   CREATE FUNCTION public.consume_ai_quota(uuid, text, integer, integer)
-- Data Risk: none. Creates one new table that no existing code reads or writes, and
--            one new function. No existing row is read, written, transformed or
--            deleted. Rolling back destroys only counter rows, which are ephemeral
--            rate-limiting state and carry no user content.
-- Rollback File: migrations/rollbacks/0015_ai_proxy_rate_limit.rollback.sql
-- Pre-Deployment Checks:
--   1. `npm run db:reset:local` applies cleanly through 0014.
--   2. No object named ai_usage_quota or consume_ai_quota already exists.
-- Post-Deployment Verification:
--   1. consume_ai_quota(u,'chat',60,3) x3      -> allowed=true, remaining 2,1,0
--   2. 4th call within the window              -> allowed=false, retry_after > 0
--   3. after the window elapses                -> allowed=true again
--   4. anon/authenticated EXECUTE on the fn    -> denied (service_role only)
--   5. authenticated SELECT on ai_usage_quota  -> 0 rows (RLS, no policies)
-- Author/Agent: Claude Opus 5 (prompt pack WOWTODO_REVIVAL_V1, release plan slice 5)
-- Created: 2026-08-18

-- ─────────────────────────────────────────────────────────────────────────────
-- Counter storage
-- ─────────────────────────────────────────────────────────────────────────────
--
-- One row per (user, kind, window length). Two windows are used per kind — a short
-- burst window and a long daily window — so a user cannot spend a whole day's budget
-- in ten seconds, and cannot drip-feed past the daily cap either. The window length
-- is part of the key precisely so both can be enforced independently.
--
-- This is a fixed-window counter, not a sliding window. A caller can therefore emit
-- up to 2x the limit across a window boundary. That is a deliberate trade: the cap
-- exists to stop runaway loops and bill shock, and 2x a small number is still small.
create table if not exists public.ai_usage_quota (
    user_id        uuid        not null references auth.users(id) on delete cascade,
    kind           text        not null check (kind in ('chat', 'transcribe')),
    window_seconds integer     not null check (window_seconds > 0),
    window_start   timestamptz not null default now(),
    request_count  integer     not null default 0 check (request_count >= 0),
    primary key (user_id, kind, window_seconds)
);

comment on table public.ai_usage_quota is
    'Rate-limit counters for the ai-proxy Edge Function (defect F3). Ephemeral state: '
    'safe to truncate, which only grants every user a fresh window.';

-- RLS on with **no policies at all** is the intent, not an oversight. Nothing outside
-- the definer function below has any business reading or writing these rows, and a
-- table with RLS enabled and zero policies denies every request from anon and
-- authenticated. service_role bypasses RLS, which is how the Edge Function reaches it.
alter table public.ai_usage_quota enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic consume-one-unit
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Read-then-write in the Edge Function would race: two concurrent requests would both
-- read count=N and both write N+1, losing a unit and letting a parallel flood through.
-- The whole check-and-increment therefore happens inside one statement-level lock here.
--
-- Returns the decision rather than raising, because being rate limited is an expected
-- outcome the caller must turn into a 429 with a Retry-After, not an error condition.
create or replace function public.consume_ai_quota(
    p_user_id        uuid,
    p_kind           text,
    p_window_seconds integer,
    p_limit          integer
)
returns table (allowed boolean, remaining integer, retry_after integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_window_start timestamptz;
    v_count        integer;
    v_expires_at   timestamptz;
begin
    if p_limit <= 0 or p_window_seconds <= 0 then
        raise exception 'consume_ai_quota: limit and window must be positive';
    end if;

    -- Ensure the row exists so the FOR UPDATE below has something to lock. Two
    -- concurrent callers race here; ON CONFLICT DO NOTHING makes the loser a no-op.
    insert into public.ai_usage_quota (user_id, kind, window_seconds, window_start, request_count)
    values (p_user_id, p_kind, p_window_seconds, now(), 0)
    on conflict (user_id, kind, window_seconds) do nothing;

    select q.window_start, q.request_count
      into v_window_start, v_count
      from public.ai_usage_quota q
     where q.user_id = p_user_id
       and q.kind = p_kind
       and q.window_seconds = p_window_seconds
       for update;

    -- Expired window: start a fresh one rather than accumulating forever.
    v_expires_at := v_window_start + make_interval(secs => p_window_seconds);
    if v_expires_at <= now() then
        v_window_start := now();
        v_count := 0;
        v_expires_at := v_window_start + make_interval(secs => p_window_seconds);
    end if;

    if v_count >= p_limit then
        -- Deliberately does NOT increment. A blocked caller hammering the endpoint
        -- must not push its own window out — that would turn a rate limit into a ban.
        return query
            select false,
                   0,
                   greatest(1, ceil(extract(epoch from (v_expires_at - now())))::integer);
        return;
    end if;

    update public.ai_usage_quota q
       set window_start  = v_window_start,
           request_count = v_count + 1
     where q.user_id = p_user_id
       and q.kind = p_kind
       and q.window_seconds = p_window_seconds;

    return query select true, p_limit - (v_count + 1), 0;
end;
$$;

comment on function public.consume_ai_quota(uuid, text, integer, integer) is
    'Atomically consumes one unit of a user''s ai-proxy quota. Returns the decision; '
    'callers turn allowed=false into HTTP 429 with Retry-After. service_role only.';

-- The function is SECURITY DEFINER and takes the user id as a parameter rather than
-- reading auth.uid(), so anyone able to execute it could bill-limit — or, worse,
-- probe — another user. Only the Edge Function's service_role may call it.
revoke all on function public.consume_ai_quota(uuid, text, integer, integer) from public;
revoke all on function public.consume_ai_quota(uuid, text, integer, integer) from anon;
revoke all on function public.consume_ai_quota(uuid, text, integer, integer) from authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer, integer) to service_role;
