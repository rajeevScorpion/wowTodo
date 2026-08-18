-- WowToDo Rollback Migration
-- Rolls Back: 0015_ai_proxy_rate_limit
-- Forward File: supabase/migrations/20260818104537_ai_proxy_rate_limit.sql
-- Title: Remove the ai-proxy per-user quota counters
-- Purpose: Reverses 0015 by dropping the counter table and the consume function.
-- Data Risk: LOW, but not zero.
--   Dropping public.ai_usage_quota destroys every counter row. Those rows are
--   ephemeral rate-limiting state, not user content — no task, todo, profile or
--   share is touched — so nothing a user would notice is lost. The practical
--   effect is that every user immediately gets a fresh window.
--
--   ⚠ The real risk is what this REINSTATES, not what it deletes. After this runs,
--   ai-proxy has no per-user spend bound again: defect F3 is live, and any
--   authenticated caller can loop the endpoint against the owner's billable OpenAI
--   key. Deploy the matching ai-proxy version (the one without the quota call) at
--   the same time, or the function will fail every request when the RPC disappears.
--
--   The body-size cap is enforced entirely inside the Edge Function and is NOT
--   affected by this rollback.
-- Verification After Rollback:
--   1. select to_regclass('public.ai_usage_quota')            -> NULL
--   2. select to_regprocedure('public.consume_ai_quota(uuid,text,integer,integer)')
--                                                             -> NULL
--   3. ai-proxy (matching version) still returns 200 for a normal request
-- Author/Agent: Claude Opus 5 (prompt pack WOWTODO_REVIVAL_V1, release plan slice 5)
-- Created: 2026-08-18

drop function if exists public.consume_ai_quota(uuid, text, integer, integer);

drop table if exists public.ai_usage_quota;
