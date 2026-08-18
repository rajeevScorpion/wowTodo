# Prompt 180 — Release Blocker Triage and Fix Plan

- **Mode:** PLAN · no fixes implemented
- **Date:** 2026-08-17 (Monday)
- **Owner objective:** Google Play publication by end of the current week
- **Inputs:** prompts 100–170, [defect register](../testing/DEFECT_REGISTER.md)

---

## The honest headline on the deadline

**Engineering can plausibly reach a release candidate this week. Publication this week is
probably not achievable, and the reason is calendar, not code.**

If the owner's Play developer account is a **personal** account created after
**13 November 2023**, Google requires a closed test with **≥12 testers opted in
continuously for ≥14 days** before production access. That is a **two-week wall** no
amount of engineering removes.

**This is the single highest-value question to answer today** — before any code is written
— because it determines whether the target is "publish Friday" or "release candidate
Friday, publish in ~2 weeks". Everything else in this plan is achievable.

Two other findings work *in favour* of the deadline: **targetSdk is already 36** (no
upgrade needed, deadline met 14 days early) and **all 44 npm vulnerabilities are build
tooling** that never reaches the device.

---

## Triage summary

| Priority | Count | Items |
|---|---|---|
| **P0** | 6 | F1, F5, privacy policy, account deletion, deploy `ai-proxy`+secrets, confirm signing |
| **P1** | 8 | F2, F3, F4, VE-1, VE-2, DF-1, expo-asset, physical-device test |
| **P2** | 9 | F6, F7, F8, DF-2…DF-5, VE-3, VE-4, crash reporting |
| **P3** | 4 | key rotation (owner), transitive permissions, notification retention, `is_branched` enforcement |

---

## Critical path to a release candidate

Slices are ordered. Slices marked ⟂ can run in parallel with the one before.

### Status — 2026-08-18

| Slice | State | Evidence |
|---|---|---|
| 1 — security P0s | ✅ **done** | migration `0013`, RLS suite 17/17 |
| 2 — production AI | ✅ **done** | secrets set + `ai-proxy` deployed, 5/5 verified against production |
| 3 — account deletion | ⛔ not started | Play blocker, HIGH data risk |
| 4 — sign-out cleanup | ✅ **done** | `clearLocalUserData`, 7 tests, mutation-verified |
| 5 — timeouts + rate limiting | ⛔ not started | |
| 6 — date extraction | ✅ **done** | `dateContext.ts`, 0/9 → 9/9 |
| 7 — branch/delete deadlock | ✅ **done** | migration `0014`, reproduced then fixed, rollback executed |
| 8 — build hygiene | ✅ **done** | `expo-doctor` 16/18 → **18/18** |
| 9 — device pass | ⛔ not started | needs slices 3 and 5 to be worth running once |

Found and fixed outside the original plan: **D7** — `eas.json` declared no `env`, so an
EAS store build would have shipped with no Supabase URL or anon key and reached nothing.

**D8 (opened and closed outside the plan).** The fixes from slices 1 and 7 had been
verified against the local mirror only, and a cloud schema dump proved they were **absent
from production** — F1 and F5 were live. Both migrations were applied to cloud on
2026-08-18 and verified there, by schema inspection and by a rolled-back behavioural test.

The underlying gap remains: there is no `supabase/migrations/` history, so nothing pushes
local migrations to cloud automatically. Every future migration needs an explicit cloud
apply — see [MIGRATION_REGISTER.md](../data/MIGRATION_REGISTER.md).

### Slice 1 — Close the two security P0s ⚠️ **BLOCKED ON AN OWNER DECISION**

- **Problem:** F1 — a share recipient can rewrite and seize ownership of the owner's todo
  (owner then sees 0 rows). F5 — any authenticated user can harvest every user's email.
- **Files:** new migration `0013_*.sql` + paired rollback; `migrations/MIGRATION_ORDER.md`;
  `docs/data/MIGRATION_REGISTER.md`; regenerate `src/types/database.ts`.
- **Depends on:** nothing technically. **Blocked on decision O-1.**
- **Migration:** yes — first migration under the new standard. Numbered `0013`, mandatory
  header, paired rollback, verified forward → rollback → reapply on the local mirror.
- **Native/deps:** none.
- **Tests:** promote the 120/150 RLS probes into a permanent suite — recipient *cannot*
  change `title`/`user_id`, *can* still toggle `completed`; `search_users` returns only
  exact matches; owner retains access throughout.
- **Rollback:** paired rollback migration. Policy-only, no data transform, so reversal is
  truthful and lossless.
- **Risk:** **Medium** — tightening a policy can break legitimate collaboration. Mitigated
  by the RLS suite covering both directions.
- **Acceptance gate:** recipient PATCH of `title` → 403; PATCH of `user_id` → 403;
  PATCH of `completed` → 204; `search_users('@')` → only exact matches; owner sees own row.

> **Owner decision O-1 required:** is share-recipient *editing* intended collaboration, or
> a bug? If intended, the fix scopes editing properly (pin `user_id`, allow `title`); if a
> bug, lock to `completed` only. **This changes the migration**, so it must be answered
> before Slice 1 starts.

### Slice 2 ⟂ — Make the core feature work in production **P0**

- **Problem:** `ai-proxy` is not deployed and cloud secrets are unset. In production every
  AI call returns `503` — voice *and* typed task creation are both dead.
- **Files:** none in-repo — `supabase secrets set`, `supabase functions deploy ai-proxy`.
- **Depends on:** key rotation should happen **first** so the rotated keys are the ones
  deployed (avoids doing this twice).
- **Migration/native:** none.
- **Tests:** repeat the 6 abuse-control checks against the deployed function
  (401/400/400/400/503→200/405), then one real end-to-end task generation.
- **Rollback:** `supabase functions delete ai-proxy`; the app fails closed with an
  actionable error, and no user data is affected.
- **Risk:** **Low**, and it is the highest-value single action in the plan.
- **Acceptance gate:** a task generated end to end against the cloud project.

### Slice 3 — Account deletion **P0 (Play requirement)**

- **Problem:** Play requires an in-app deletion path *and* a web-accessible deletion URL.
  Only `signOut` exists.
- **Files:** migration `0014` (`delete_own_account` `SECURITY DEFINER` RPC); `settings.tsx`
  (destructive action + confirmation); `web/` (public deletion-request page).
- **Depends on:** Slice 1 (same migration discipline; avoid two agents writing policies).
- **Migration:** yes — `0014` + rollback. **Data risk: HIGH.** The RPC deletes user rows;
  the rollback can drop the *function* but **cannot restore deleted user data**. Per the
  standard this must be stated plainly rather than pretending rollback is safe.
- **Tests:** deletion removes tasks, todos, groups, profile, shares, reminders and the
  `auth.users` row; another user's data is untouched; cascade behaviour verified — note
  **DF-1's `RESTRICT` FK will block deletion for users with branched todos** unless
  handled. That coupling is why Slice 7 should land first or be folded in.
- **Rollback:** feature-flag the UI entry point; the RPC can be dropped.
- **Risk:** **High** — irreversible by design. Requires an explicit typed confirmation.
- **Acceptance gate:** account deleted, all owned rows gone, other users unaffected, user
  signed out.

### Slice 4 — Sign-out cleanup **P1 (privacy)**

- **Problem:** F2 — the AsyncStorage-persisted query cache (7-day `gcTime`) survives
  sign-out, so the next account on the device sees the previous user's tasks; the previous
  user's reminders keep firing their private todo titles on the lock screen.
- **Files:** `AuthProvider.tsx` (handle the `SIGNED_OUT` event it currently discards),
  `app/_layout.tsx` (persister), `settings.tsx`; call the existing but unused
  `clearReminderSettingsCache()`.
- **Depends on:** none.
- **Migration/native:** none.
- **Tests:** sign out as A → sign in as B → B sees no A data; A's scheduled notifications
  are cancelled; persisted cache key cleared.
- **Rollback:** small, isolated revert.
- **Risk:** **Low.** Highest privacy-per-line-changed in the plan.
- **Acceptance gate:** regression checklist A6 and A7 pass.

### Slice 5 — Reliability: timeouts, cancellation, rate limiting **P1**

- **Problem:** F4 — zero `AbortController` anywhere; a stalled AI call hangs the voice UI
  forever with no cancel. F3 — `ai-proxy` has no rate limit or body-size cap, so one free
  account can drain the OpenAI budget.
- **Files:** `services/ai/proxy.ts` (timeout + abort), `useVoiceRecording.ts` (cancel
  affordance), `supabase/functions/ai-proxy/index.ts` (per-user rate limit, body cap).
- **Depends on:** Slice 2 (deploy the rate limit with the function).
- **Tests:** simulated stall surfaces a timeout error and the UI recovers; oversized body
  → 413; burst beyond quota → 429.
- **Rollback:** generous limits initially; tighten after observing real traffic.
- **Risk:** **Medium** — a too-tight limit would break legitimate use. Start permissive.
- **Acceptance gate:** checklist C6 (airplane mode) passes instead of hanging.

### Slice 6 ⟂ — Fix date extraction **P1, cheapest high-value fix in the plan**

- **Problem:** VE-1 — named weekdays resolve to the wrong date, 9/9 deterministic.
  "next Monday" → Friday. Reminders fire on the wrong day, which is the product's core
  promise.
- **Files:** `services/ai/openai.ts` (`buildUserMessage`) and the matching Gemini path —
  include the **weekday** in the `[CURRENT DATE]` tag; `prompt.ts` only if needed.
- **Depends on:** none.
- **Migration/native:** none.
- **Tests:** re-run `scripts/eval-voice-baseline.mjs`; the 9 weekday cases must go 0/9 → 9/9
  with no regression in the 18-case set.
- **Rollback:** one-line revert; the baseline harness proves the delta both ways.
- **Risk:** **Low.** Prompt-layer only, no schema or contract change.
- **Acceptance gate:** 9/9 weekday accuracy, 18/18 structured-output validity maintained.

### Slice 7 ⟂ — Branch/delete deadlock **P1**

- **Problem:** DF-1 — a task containing a branched todo cannot be deleted (409). The
  mutation optimistically removes it then silently rolls back, so it presents as the task
  vanishing and reappearing.
- **Files:** `features/tasks/api.ts` (`useDeleteTask`/`useDeleteTodo` — unlink branches
  first, and surface the error instead of swallowing it), `TodoItem.tsx` (gate or explain
  the delete affordance). A migration changing the FK to `SET NULL` is an **alternative**
  — decide one, not both.
- **Depends on:** should land **before or with Slice 3**, since account deletion hits the
  same `RESTRICT` FK.
- **Migration:** only if the FK approach is chosen — then `0015` + rollback.
- **Tests:** delete a branched todo; delete a task containing one; confirm the user sees a
  message on any failure.
- **Risk:** **Low–Medium.**
- **Acceptance gate:** neither delete returns an unexplained 409.

### Slice 8 ⟂ — Build hygiene **P1**

- `expo-asset` as a direct dependency → `expo-doctor` 18/18.
- Delete the dead `EXPO_PUBLIC_*_API_KEY` entries from `.env`.
- **Risk: Low.** **Gate:** doctor 18/18, app still launches (screenshot required — a green
  typecheck is not evidence).

### Slice 9 — Physical-device pass **P1**

Run the full [regression checklist](../testing/REGRESSION_CHECKLIST.md) on real hardware.
All evidence to date is emulator-only, and the owner's baseline was a physical device.
**Gate:** no P0/P1 regressions; voice, reminders and notifications confirmed on device.

---

## Parallel owner actions (no engineering dependency)

These gate publication and **should start today** — several have multi-day latency.

| # | Action | Urgency |
|---|---|---|
| O1 | **Confirm Play account type and creation date** → does the 12-tester/14-day rule apply? | **Today — determines the whole timeline** |
| O2 | **Decision O-1:** is share-recipient editing intended? | **Today — blocks Slice 1** |
| O3 | **Rotate OpenAI and Gemini keys** | Today — Slice 2 should deploy the rotated keys |
| O4 | Write + host the privacy policy (`web/` is the natural home) | High — blocks Data Safety, which blocks submission |
| O5 | If O1 applies: **recruit 12 testers and start the closed test immediately** | **Critical path** — every day of delay is a day of publication delay |
| O6 | Store listing: feature graphic, ≥2 screenshots, short + full description | Medium |
| O7 | Demo credentials for Play review (the app is behind a login — review fails without them) | Medium |
| O8 | Confirm EAS-managed signing or supply an upload keystore | High |
| O9 | Complete content rating, target audience, ads declarations | Medium |

---

## Explicitly deferred

| Item | Why |
|---|---|
| **Agentic voice intent system (210)** | Strategically important, but replacing a stable pipeline during release week is exactly what the scope guard forbids. The 160 baseline now exists; do it after release, behind a flag and canary |
| **Expo SDK 54 → 57** | npm's proposed fix for ~20 advisories. Zero end-user security benefit (proven), major native churn. Post-release |
| **Analytics feature** | Currently a "Coming soon" stub. **Hide the entry point for v1** rather than ship a dead end — cheap, and removes a quality signal reviewers notice |
| VE-2 (fabrication vs clarification) | Requires a schema change to carry a clarifying question. Belongs with the agentic work |
| VE-3, VE-4 (language tag, over-decomposition) | Prompt-quality, not correctness. Post-release with baseline measurement |
| F6, F7, F8 (search_path, rollbacks, notification retention) | P2 hardening, no user-facing impact |
| Crash reporting | Valuable but not blocking; Play vitals give partial coverage |
| iOS | Never built. Out of scope for an Android launch |

---

## Recommended next prompt-pack boundaries

1. **Pack A — Release Candidate (Slices 1–8).** Security, production enablement, account
   deletion, reliability, date fix. Every data change numbered from `0013` with paired,
   *tested* rollbacks.
2. **Pack B — Release Execution (Slice 9 + owner actions).** Device pass, store content,
   closed test, submission.
3. **Pack C — Agentic Voice (prompt 210).** Only after A and B. Must open with the 160
   baseline as its regression gate, and ship behind a flag with a canary.

## Risk register for the plan itself

| Risk | Mitigation |
|---|---|
| Slice 1 tightens policies and breaks legitimate sharing | RLS suite asserting both allowed *and* denied paths before merging |
| Slice 3 is irreversible by design | Typed confirmation; document the rollback's real limits rather than overstating them |
| Slice 5 rate limits are too aggressive | Ship permissive, tighten on observed traffic |
| Fixes are validated only by typecheck | **Every slice requires runtime evidence.** Three defects this week passed typecheck and jest and still broke the running app |
| 12-tester rule discovered late | O1 answered today |
