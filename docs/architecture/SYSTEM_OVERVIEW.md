# System Overview

**Current state as of 2026-08-17.** Planned agentic architecture is *not* described here —
see prompt 210 output when it exists.

Full evidence: [120 audit](../audits/120_ARCHITECTURE_BACKEND_DATA_AND_SECURITY_AUDIT.md).

## Repository shape

Two independent projects, deliberately **no workspace tooling** — hoisting is a common
cause of broken Expo/RN builds and they share nothing.

| Folder | What | Stack |
|---|---|---|
| [`app/`](../../app/) | The product | Expo 54 / RN 0.81.5 / React 19.1 |
| [`web/`](../../web/) | Marketing site | Vite 6 / React 19 / Tailwind v4 |

## Layers

```
Screens (expo-router, 21 routes under app/app/)
   ↓  may ONLY talk to ↓
features/*/api.ts  ── the single data-access layer (React Query hooks)
   ↓                        ↓
services/            lib/supabase.ts
  ai/ · reminders/ · voice
```

**Invariant worth protecting:** no screen calls `supabase.from()` directly. Every
table read/write goes through `features/{tasks,groups,profile,reminders,sharing}/api.ts`.
This is what keeps cross-cutting fixes (cache clearing, error handling, telemetry)
tractable — a change lands in 5 files, not 21.

## State management

| Kind | Mechanism |
|---|---|
| Auth session | `AuthProvider` React Context, persisted to AsyncStorage, auto-refresh on `AppState 'active'` |
| Server state | TanStack React Query with centralised query-key factories |
| Cache persistence | `PersistQueryClientProvider` → AsyncStorage key `wowtodo-query-cache` |
| Realtime | Supabase Realtime on `todos`, `shares`, `in_app_notifications` |
| UI state | Local component state |

Cache policy: `staleTime` 2 min, `gcTime` 7 days, `refetchOnReconnect: true`,
`refetchOnWindowFocus: false`, mutations `retry: 0` (optimistic rollback owns failure).

> ⚠️ The persisted cache is **not cleared on sign-out** — defect **F2**.

## Backend

Supabase: Postgres + PostgREST + GoTrue + Realtime + Edge Functions.

- 8 tables, **RLS enabled on all**, 17 policies
- 13 functions (10 `SECURITY DEFINER`), 11 triggers, 28 indexes
- **No storage buckets** — so no bucket-policy surface
- One Edge Function: `ai-proxy` (Deno)

See [DATA_MODEL.md](../data/DATA_MODEL.md) and
[AUTH_AND_SECURITY.md](AUTH_AND_SECURITY.md).

## Trust boundary

The device holds only the Supabase **anon key** (public by design) and the user's JWT.
All AI provider keys live in the `ai-proxy` Edge Function environment. Verified by
scanning a production bundle: 1 JWT, 0 `sk-`, 0 `AIza`.

## Known architectural gaps

| Gap | Defect |
|---|---|
| No request timeout / cancellation anywhere | F4 |
| No rate limiting on the AI proxy | F3 |
| No AI observability (latency, cost, fallback rate, prompt version) | — blocks 160 |
| No idempotency on task creation — a drop after AI returns loses the transcript and re-bills on retry | — |
