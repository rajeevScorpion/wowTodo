-- WowToDo Rollback Migration
-- Rolls Back: 0017_agentic_observability
-- Forward File: supabase/migrations/20260820101115_agentic_observability.sql
-- Title: Remove the agentic run metrics, task provenance and todo notes
-- Purpose: Reverses 0017 by dropping public.ai_runs, the three provenance columns on
--          tasks, and todos.note.
--
-- Data Risk: SPLIT — two of the three parts are free, the third is not. Read this
--            before running it.
--
--   FREE — public.ai_runs and tasks.agent / ai_confidence / prompt_version.
--     These hold metrics and provenance, never user content. Dropping them loses the
--     ability to attribute a regression to a prompt version and blinds the rollout
--     monitoring, which is an operational cost, not a user-visible one. No task,
--     todo, profile or share is touched.
--
--   ⚠ DESTRUCTIVE ONCE POPULATED — todos.note.
--     After the agentic path ships, `note` holds content the user can see and relies
--     on: a recipe step's quantity, a booking reference, a caveat attached to a step.
--     Dropping the column deletes that text irrecoverably, and the todo it belonged
--     to survives looking subtly wrong rather than obviously broken — the worst shape
--     of data loss, because nobody notices in time to restore.
--
--     So this script REFUSES to run while any non-null note exists. That is the
--     expand/contract discipline the migration standard asks for: reversal is safe
--     before the feature is used and must be a deliberate act afterwards.
--
--     To drop it anyway, having decided the notes are expendable:
--
--         begin;
--         set local wowtodo.force_drop_notes = 'on';
--         \i 0017_agentic_observability.rollback.sql
--         commit;
--
--     To keep the notes, export them first:
--
--         \copy (select id, task_id, note from public.todos where note is not null)
--               to 'todo_notes_backup.csv' csv header
--
-- Verification After Rollback:
--   1. select to_regclass('public.ai_runs')                        -> NULL
--   2. select count(*) from information_schema.columns
--        where table_name='tasks' and column_name in
--          ('agent','ai_confidence','prompt_version')              -> 0
--   3. select count(*) from information_schema.columns
--        where table_name='todos' and column_name='note'           -> 0
--   4. npm run verify:rls                                          -> 17/17
--   5. npm run verify:account-deletion                             -> passes without
--      the ai_runs assertions (remove them from the script alongside this rollback)
--   6. The app still creates tasks — every dropped column was nullable and no
--      pre-0017 code path referenced any of them. A post-0017 client WILL break:
--      deploy the matching client/function version at the same time.
-- Author/Agent: Claude Opus 5 (prompt pack WOWTODO_REVIVAL_V1, prompt 210 phase 0)
-- Created: 2026-08-20

-- ─────────────────────────────────────────────────────────────────────────────
-- Guard first, drop second.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Deliberately placed ahead of every DROP so that refusing aborts before anything
-- has been destroyed. A guard that fires halfway through would leave the schema in
-- a state that is neither 0016 nor 0017.
do $$
declare
    v_notes bigint;
begin
    if to_regclass('public.todos') is null then
        return;
    end if;

    execute 'select count(*) from public.todos where note is not null' into v_notes;

    if v_notes > 0 and coalesce(current_setting('wowtodo.force_drop_notes', true), 'off') <> 'on' then
        raise exception
            'Refusing to roll back 0017: % todo note(s) would be permanently deleted. '
            'Export them, then re-run with: set local wowtodo.force_drop_notes = ''on'';',
            v_notes
            using errcode = 'raise_exception';
    end if;

    if v_notes > 0 then
        raise warning 'Dropping todos.note with % populated row(s) — forced.', v_notes;
    end if;
exception
    when undefined_column then
        -- Already rolled back, or never applied. Nothing to guard.
        null;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Drops
-- ─────────────────────────────────────────────────────────────────────────────

alter table if exists public.todos drop column if exists note;

alter table if exists public.tasks drop column if exists ai_confidence;
alter table if exists public.tasks drop column if exists prompt_version;
alter table if exists public.tasks drop column if exists agent;

-- The policy and index go with the table; named here so the reversal is legible
-- rather than implied.
drop policy if exists "Users read own AI runs" on public.ai_runs;
drop index if exists public.ai_runs_user_created_idx;
drop table if exists public.ai_runs;
