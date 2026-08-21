-- WowToDo Forward Migration
-- Migration Number: 0017
-- Migration Identifier: 0017_agentic_observability
-- Title: Run metrics and task provenance for the agentic intent system
-- Purpose: Phase 0 of the agentic redesign (prompt 210). Adds the measurement
--          substrate that every later phase is judged against.
--
--          The prompt-160 evaluation recorded the gap plainly: "nothing records
--          prompt version, latency, cost, or fallback rate", which makes A/B
--          attribution impossible. Today a broken OpenAI path looks fine from the
--          outside — the client silently falls through to Gemini and the user just
--          waits longer. Once a router and six specialist prompts exist, that
--          blindness stops being tolerable: a regression could be in any of them
--          and nothing would say which.
--
--          Three additions, all additive and all nullable:
--            1. public.ai_runs        — one row per AI request, metrics only
--            2. tasks.agent /         — which specialist produced a task, how sure
--               ai_confidence /         it was, and under which prompt version, so a
--               prompt_version          bad batch of tasks can be traced to a cause
--            3. todos.note            — the detail a specialist needs but a title
--                                       should not carry (quantities, references)
--
--          ⚠ ai_runs deliberately has NO column for the utterance, transcript,
--          task title or todo text. Prompt 210 requires metrics that do not expose
--          sensitive full utterances by default, and a column that exists is a
--          column something will eventually write to. The correlation key is
--          `task_id`, which reaches the content through normal RLS if a user asks
--          for it — and disappears with the task when they delete it.
-- Depends On: 0001 (auth.users, tasks, todos), 0016 (auth-admin cascade grants)
-- Affected Objects:
--   CREATE TABLE  public.ai_runs
--   CREATE INDEX  ai_runs_user_created_idx
--   CREATE POLICY "Users read own AI runs" ON public.ai_runs
--   ALTER TABLE   public.tasks  ADD agent, ai_confidence, prompt_version
--   ALTER TABLE   public.todos  ADD note
-- Data Risk: none. Creates one new table that no existing code reads or writes, and
--            adds four nullable columns. No existing row is read, written,
--            transformed or deleted; every existing INSERT and SELECT keeps working
--            unchanged because every new column defaults to NULL.
-- Rollback File: migrations/rollbacks/0017_agentic_observability.rollback.sql
-- Pre-Deployment Checks:
--   1. `npm run db:reset:local` applies cleanly through 0016.
--   2. No object named ai_runs already exists.
--   3. tasks/todos have no column named agent, ai_confidence, prompt_version, note.
-- Post-Deployment Verification:
--   1. npm run verify:account-deletion  -> ai_runs cascades with the user
--   2. npm run verify:rls               -> 17/17, unchanged
--   3. authenticated SELECT on another user's ai_runs -> 0 rows
--   4. authenticated INSERT into ai_runs                -> denied (no policy)
--   5. share recipient PATCH todos {"note":"x"}         -> 403 (0013 trigger)
--   6. npm run gen:types                                -> types include the columns
-- Author/Agent: Claude Opus 5 (prompt pack WOWTODO_REVIVAL_V1, prompt 210 phase 0)
-- Created: 2026-08-20

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Run metrics
-- ─────────────────────────────────────────────────────────────────────────────
--
-- One row per AI request, written by the Edge Function with the service role.
--
-- `outcome` distinguishes the four things that are all "the user didn't get a task"
-- but have completely different meanings — refusing to collapse them is the whole
-- point of the table:
--   ok           the specialist produced a task that passed validation
--   clarified    the router asked a question instead of guessing (a SUCCESS —
--                the pipeline declining to fabricate is the behaviour we want)
--   invalid      output failed deterministic validation after the repair attempt
--   error        upstream or internal failure
--   rate_limited quota refused the request before any spend
create table if not exists public.ai_runs (
    id             uuid        primary key default gen_random_uuid(),
    user_id        uuid        not null references auth.users(id) on delete cascade,

    -- What the user was doing. Matches the existing call sites in services/ai.
    kind           text        not null check (kind in ('task', 'branch', 'transcribe')),

    -- Which specialist handled it; NULL on the legacy single-prompt path, which is
    -- how the rollout rate is measured without a separate flag column.
    agent          text,
    prompt_version text,
    model          text,
    router_model   text,

    outcome        text        not null
                               check (outcome in ('ok','clarified','invalid','error','rate_limited')),

    -- Short machine code only (e.g. 'upstream_502', 'schema_todos_empty'). Never a
    -- provider message: those quote the request back and would smuggle user content
    -- into a table that promises not to hold any.
    error_code     text        check (error_code is null or char_length(error_code) <= 64),

    -- True when the agentic path failed and the legacy path served the request.
    -- Currently invisible; a silently-always-falling-back agent would otherwise look
    -- exactly like a working one.
    fallback_used  boolean     not null default false,

    latency_ms     integer     check (latency_ms is null or latency_ms >= 0),
    tokens_in      integer     check (tokens_in is null or tokens_in >= 0),
    tokens_out     integer     check (tokens_out is null or tokens_out >= 0),

    -- Correlation only. Nullable because a clarified or failed run has no task, and
    -- ON DELETE SET NULL because deleting a task must not erase the cost record of
    -- having produced it.
    task_id        uuid        references public.tasks(id) on delete set null,

    created_at     timestamptz not null default now()
);

comment on table public.ai_runs is
    'Per-request AI metrics for the agentic intent system (prompt 210). Contains NO '
    'utterance, transcript or task content by design — correlate through task_id. '
    'Written by Edge Functions via service_role; users may read their own rows.';

comment on column public.ai_runs.agent is
    'Specialist that handled the request; NULL on the legacy single-prompt path.';

comment on column public.ai_runs.outcome is
    'ok | clarified | invalid | error | rate_limited. "clarified" is a success: the '
    'pipeline asked rather than fabricating (prompt-160 failure mode 2).';

-- Every read is "this user's recent runs", for the Settings usage view and for
-- rollout monitoring.
create index if not exists ai_runs_user_created_idx
    on public.ai_runs (user_id, created_at desc);

alter table public.ai_runs enable row level security;

-- SELECT-own only, and deliberately no INSERT/UPDATE/DELETE policy.
--
-- Unlike ai_usage_quota (0015), which has RLS and zero policies because nothing but
-- the definer function has any business touching it, these rows are *about* the user
-- and they should be able to see what the app spent on their behalf — that is a
-- reasonable thing for a Play reviewer to expect too. Writes stay service_role-only:
-- a client that could insert here could forge its own usage history.
drop policy if exists "Users read own AI runs" on public.ai_runs;
create policy "Users read own AI runs"
    on public.ai_runs
    for select
    to authenticated
    using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Task provenance
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ai_runs answers "how is the system behaving". These answer "why is THIS task
-- like this" — the question actually asked when a user reports a bad result. Kept
-- on the task rather than joined through ai_runs so the answer survives any future
-- retention policy on the metrics table.
alter table public.tasks add column if not exists agent          text;
alter table public.tasks add column if not exists prompt_version text;
alter table public.tasks add column if not exists ai_confidence  numeric(3,2)
    check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1));

comment on column public.tasks.agent is
    'Specialist that generated this task (prompt 210); NULL for tasks created before '
    'the agentic path, or by it in fallback.';
comment on column public.tasks.ai_confidence is
    'Router confidence 0.00-1.00 in its own routing decision. Not a quality score.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Todo detail
-- ─────────────────────────────────────────────────────────────────────────────
--
-- A recipe step is useless without an amount, and "Dice 2 onions (finely, for the
-- masala base)" is a bad checklist item. The measurable version of this problem:
-- the eval harness scores V19 (chicken biryani for six) as missing quantities today.
--
-- Recipients cannot write this. 0013's trigger compares the whole row via
-- `to_jsonb(new) - 'completed' - 'updated_at'`, which was written that way
-- specifically so a column added by a later migration does not silently become
-- recipient-writable. Verification step 5 above proves it rather than trusting it.
alter table public.todos add column if not exists note text;

comment on column public.todos.note is
    'Optional detail that belongs with a step but not in its title — quantities, '
    'booking references, a caveat. Owner-writable only (0013 trigger).';
