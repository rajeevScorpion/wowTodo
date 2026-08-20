# Current State

**Last updated:** 2026-08-17 (prompt 140)
**Commit:** `c3ce5c6`
**Overall:** The app builds, installs and runs on an Android emulator against a local
Supabase mirror. The core product loop — voice → transcript → AI-generated todos →
persisted, reminder-scheduled tasks — is verified working end to end. It is **not yet
release-ready**: one P0 security defect and several P1s are open.

---

## What is verified working

Each item below was observed running, not inferred from code.

| Capability | Evidence |
|---|---|
| Android build + launch | `expo run:android`, app reaches home screen |
| Google OAuth sign-in (only method) | signed in on emulator |
| AI task generation from typed text | "How to make mango lassi" → 7 todos persisted |
| Voice → Whisper → todos | confirmed by owner after enabling emulator mic |
| `ai-proxy` Edge Function | real OpenAI round trip; 6 abuse controls return 401/400/400/400/503/405 |
| No AI keys in client bundle | production bundle scan: 0 `sk-`, 0 `AIza`, 1 JWT (public anon key) |
| RLS both directions | owner sees own row; other user `[]`; anon `[]` |
| Android notifications | `POST_NOTIFICATIONS` `granted=true` at runtime |
| Local Supabase mirrors cloud | 8 tables / 13 functions / 17 policies, diffed against linked project |
| Type safety | `npm run typecheck` → 0 errors |
| Unit tests | `npm test` → 26/26 passing (reminder scheduler, date context, sign-out cleanup) |
| Migrations replay | `npm run db:reset:local` applies all 14 cleanly |
| Authorisation suite | `npm run verify:rls` → 17/17, two real users through PostgREST |
| Rollback verified | 0013 **and** 0014 completed forward → verify → rollback → verify → reapply |
| Dependency health | `npx expo-doctor` → **18/18** |
| Production AI | `ai-proxy` deployed with rotated keys; real completion returned through the live function |
| Play target API | release manifest `targetSdkVersion=36` — meets the 31 Aug 2026 rule |

## What is broken or open

See [DEFECT_REGISTER.md](../testing/DEFECT_REGISTER.md) for the full list.

| ID | Sev | Summary |
|---|---|---|
| ~~F1~~ | ~~P0~~ | ✅ **FIXED** (migration 0013) — recipient can no longer rewrite or seize a todo |
| F2 | P1 | Sign-out leaves previous user's cached data and reminders on the device |
| F3 | P1 | `ai-proxy` has no rate limit or body-size cap — billing abuse risk |
| F4 | P1 | No timeouts or cancellation anywhere — stalled AI call hangs the UI |
| ~~F5~~ | ~~P1~~ | ✅ **FIXED** (migration 0013) — email harvesting closed |
| ~~D1~~ | ~~P1~~ | ✅ **FIXED & DEPLOYED** (2026-08-20) — in-app deletion in Settings + web `/delete-account`; migration 0016 made the cascade possible |
| F6–F8 | P2 | `search_path` hardening, migration standard, unbounded notifications |

## What has never been verified

Honest gaps — not claims of breakage.

- **Screens now render-verified** (prompt 150): analytics, people, shared, notifications,
  profile, settings, tasks — 0 JS errors, process stable. Still unexercised *interactively*:
  people-detail, profile-view, review, branch.
- **Physical device.** All runtime evidence is from an Android emulator.
- **iOS.** Never built or run.
- **Offline behaviour.** Cache persists and `refetchOnReconnect` is set, but mutation
  queueing while offline is untested.
- **Voice accuracy baseline.** No evaluation dataset exists. Scheduled for prompt 160.
- **Production Supabase.** No Edge Function deployed, no secrets set in the cloud project.

## Environment

| | |
|---|---|
| Local Supabase | ports 55321–55329 (54xxx collides with another project on this machine) |
| Emulator → host | `http://10.0.2.2:55321` — **not** `127.0.0.1` |
| Emulator mic | requires launch with `-allow-host-audio` **and** the Extended Controls "Virtual microphone uses host audio input" toggle, which resets on every restart |

## Immediate next actions

1. ✅ Prompt pack 100–190 complete; gate **PASS**. See
   [PROMPT_PACK_EXECUTION_INDEX](../PROMPT_PACK_EXECUTION_INDEX.md).
2. ✅ Slice 1 done — F1 and F5 closed by migration 0013.
3. **Start the Play closed test today** — the account is personal and post-Nov-2023, so the
   12-tester / 14-day rule applies. It is the critical path and no engineering shortens it.
4. Rotate OpenAI and Gemini API keys, then deploy `ai-proxy` with the rotated keys
   (Slice 2) — until then the core feature returns `503` in production.
5. Continue [RELEASE_PLAN.md](RELEASE_PLAN.md) slices 3–8.
