# Prompt 120 — Architecture, Backend, Data and Security Audit

**Mode:** AUDIT

## Objective
Map architecture and data/security responsibilities well enough that future feature work does not accidentally bypass existing contracts or weaken security.

## Inspect
- application layers/modules and ownership boundaries;
- navigation/state management/cache/local persistence;
- auth/session/token refresh/logout/account lifecycle;
- backend service(s), Supabase project integration if present;
- tables/views/functions/triggers/indexes/migrations;
- RLS/policies and ownership/collaboration model;
- realtime subscriptions if present;
- storage buckets/policies if present;
- API/Edge/server functions;
- voice/transcription/AI calls: which execute on client vs server;
- secret placement and whether elevated credentials could reach client bundles;
- rate limits/retry/timeouts/cancellation;
- logging/analytics/crash data and sensitive payload handling;
- deletion/account/data retention paths if present;
- offline/local data and sync/conflict handling if present.

## Required outputs
1. Text architecture diagram/data flow.
2. Data dictionary/table ownership summary.
3. Auth/RLS positive and negative access model.
4. External service/integration inventory with data sent/received.
5. Security/privacy findings ranked P0–P3.
6. Migration convention audit against `02_MIGRATION_AND_ROLLBACK_STANDARD.md`.
7. Areas where current architecture is strong and should be preserved.
8. Unknowns that must be resolved before agentic voice changes.

## Restrictions
Audit only. No migrations, policy changes, secret rotation or provider changes.
