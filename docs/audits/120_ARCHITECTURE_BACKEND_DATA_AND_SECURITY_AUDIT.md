# Prompt 120 — Architecture, Backend, Data and Security Audit

- **Mode:** AUDIT (inspect/report only — no migrations, policy changes or secret rotation performed)
- **Date:** 2026-08-17
- **Repo state:** clean tree at `c3ce5c6`
- **Evidence base:** live local Supabase mirror (`supabase_db_wowtodo`), replayed from
  `migrations/` via `npm run db:reset:local`; source tree at `app/` (74 TS/TSX files)
- **Status:** Complete. 8 findings (1×P0, 4×P1, 3×P2).

> All security findings below were reproduced against the local database using real
> authenticated JWTs issued by local GoTrue, not inferred from reading SQL.

---

## 1. Architecture and data flow

```
┌─ DEVICE (Expo / React Native 0.81.5, new arch) ──────────────────────────────┐
│                                                                              │
│  app/_layout.tsx                                                             │
│    ├── AuthProvider ............ Supabase session, AsyncStorage persisted     │
│    ├── PersistQueryClientProvider                                            │
│    │      └── AsyncStorage key `wowtodo-query-cache`  (gcTime 7 days)  ⚠ F2  │
│    ├── ThemeProvider / ToastContext                                          │
│    └── syncReminderWindow() on cold start + AppState 'active'                │
│                                                                              │
│  Screens (expo-router, 21 routes)                                            │
│    └── features/*/api.ts  ← the ONLY data-access layer (React Query hooks)    │
│            tasks · groups · profile · reminders · sharing                    │
│                                                                              │
│  services/                                                                   │
│    ├── ai/       index → openai → (fallback) gemini ; whisper                │
│    │              all calls go through ai/proxy.ts        ⚠ F4 no timeout    │
│    ├── voice.ts + hooks/useVoiceRecording.ts  (expo-audio)                   │
│    └── reminders/ scheduler · settingsCache · setup                          │
│            └── expo-notifications (local only, 60-item rolling window)       │
└──────────────────────────────────────────────────────────────────────────────┘
        │ anon key + user JWT                        │ user JWT (Bearer)
        ▼                                            ▼
┌─ SUPABASE ───────────────────────────┐   ┌─ EDGE FUNCTION ai-proxy (Deno) ───┐
│  PostgREST → 8 tables, all RLS on    │   │  verifies JWT, model allow-list   │
│  13 functions (10 SECURITY DEFINER)  │   │  holds OPENAI_/GEMINI_API_KEY     │
│  11 triggers · 28 indexes            │   │  ⚠ F3 no rate limit / size cap    │
│  Realtime: todos, shares,            │   └────────────┬──────────────────────┘
│            in_app_notifications      │                │
│  Storage buckets: NONE               │                ▼
│  GoTrue: Google OAuth + email/pw     │        OpenAI (gpt-4o-mini, whisper-1)
└──────────────────────────────────────┘        Google (gemini-2.0-flash)
```

**Voice path (client → server boundary):**
`useVoiceRecording` (expo-audio, m4a, ≤10 min) → `transcribeVoice(uri)` →
`proxyFormData` → **ai-proxy** → OpenAI `whisper-1` → transcript returns to device →
`generateTasks(transcript)` → **ai-proxy** → `gpt-4o-mini` (JSON mode) → todos →
`useCreateTaskWithTodos` → Postgres.

No AI provider key exists on the device. Confirmed: `grep EXPO_PUBLIC_OPENAI` returns no
hits in `src/`.

---

## 2. Data dictionary and ownership

| Table | Owner column | RLS | Policies | Realtime | Notes |
|---|---|---|---|---|---|
| `tasks` | `user_id` | ✅ | 2 | — | `parent_todo_id` enables branches |
| `todos` | `user_id` | ✅ | 4 | ✅ | ⚠ F1 — recipient can reassign `user_id` |
| `task_groups` | `user_id` | ✅ | 1 | — | |
| `user_profiles` | `user_id` | ✅ | 3 | — | owner-only; correctly returns `[]` to others |
| `shares` | `owner_id` + `recipient_id` | ✅ | 3 | ✅ | status: pending→accepted/rejected/revoked |
| `in_app_notifications` | `user_id` | ✅ | 2 | ✅ | no DELETE policy (rows immortal) |
| `reminder_settings` | `user_id` | ✅ | 1 | — | flat `slot1_*`..`slot3_*` columns |
| `scheduled_reminders` | `user_id` | ✅ | 1 | — | unique (todo_id, slot_number) |

Every table has RLS enabled and at least one policy. No table is world-readable.
No storage buckets exist, so no bucket policy surface.

---

## 3. Auth / RLS access model (verified both directions)

**Positive:** owner CRUD on all 8 tables via `auth.uid() = user_id`; share recipient
reads task + todos via `is_task_shared_with()`; branch visibility via
`is_branch_visible_to()`.

**Negative (verified):**

| Test | Expected | Observed |
|---|---|---|
| New user reads `user_profiles` | `[]` | `[]` ✅ |
| Non-owner reads another's `todos` | `[]` | `[]` ✅ (verified in prompt 110) |
| Anon reads `todos` | `[]` | `[]` ✅ |
| New user calls `search_users('@')` | own results only | **all users + emails** ❌ F5 |
| Recipient edits shared todo `title` | denied | **allowed** ❌ F1 |
| Recipient sets shared todo `user_id` to self | denied | **allowed** ❌ F1 |

---

## 4. External integrations

| Service | Data sent | Data received | Key location | Retention |
|---|---|---|---|---|
| OpenAI `whisper-1` | raw m4a **voice audio** | transcript text | Edge Function env | per OpenAI API policy (not zero-retention) |
| OpenAI `gpt-4o-mini` | transcript / typed text | JSON task+todos | Edge Function env | as above |
| Google `gemini-2.0-flash` | same text (fallback only) | JSON | Edge Function env | per Google policy |
| Supabase | all user data | — | anon key (public by design) | project-controlled |
| Google OAuth | auth only | id/email | client ID (public) | — |

**Privacy consequence:** user voice recordings leave the device to a US third party.
This must be declared in the privacy policy and Play Data Safety form (carried to 170).

---

## 5. Security and privacy findings

### F1 — P0 · Share recipient can seize ownership of the owner's todo
`todos` policy *"Recipient toggles todo completion"* is `FOR UPDATE` with both `USING`
and `WITH CHECK` = `is_task_shared_with(task_id, auth.uid())`. Neither expression
constrains **which columns** may change, and `WITH CHECK` does not pin `user_id`.

Reproduced end-to-end via PostgREST as an accepted recipient:
```
PATCH /todos?id=eq.<id>  {"title":"HIJACKED by recipient"}      → 200, applied
PATCH /todos?id=eq.<id>  {"user_id":"<recipient uuid>"}          → 200, applied
```
Then, under RLS: **owner sees 0 rows, recipient sees 1**. The owner permanently and
silently loses their own todo; no audit trail, no notification. Also lets a recipient
rewrite `title`/`due_date`, and moving `user_id` re-points reminder scheduling.

*Fix direction (not applied):* restrict the recipient UPDATE `WITH CHECK` to pin
`user_id`, `task_id` and `title` to their existing values — e.g. a `BEFORE UPDATE`
trigger that rejects any change other than `completed` when `auth.uid() <> user_id`.

### F2 — P1 · Sign-out leaves the previous user's data on the device
`onSignOut` is `await supabase.auth.signOut()` only ([settings.tsx:38](../../app/app/(app)/settings.tsx#L38)).
`onAuthStateChange` discards the event (`(_event, session) =>`), so `SIGNED_OUT` triggers
no cleanup. Consequently:
1. `queryClient.clear()` is never called — and the cache is **persisted to AsyncStorage**
   under `wowtodo-query-cache` with `gcTime` 7 days, so the next account on the device
   rehydrates the previous user's tasks/todos.
2. `cancelAllScheduledNotificationsAsync()` is never called — the previous user's
   reminders keep firing, showing their private todo titles on the lock screen.
3. `clearReminderSettingsCache()` exists but has **zero call sites** repo-wide.

### F3 — P1 · `ai-proxy` has no rate limit, quota or body-size cap
Any authenticated user may call the function unboundedly. Whisper accepts uploads up to
25 MB. One script on one free account can drain the owner's OpenAI billing. Model
allow-listing and JWT verification are correctly in place; volume control is not.

### F4 — P1 · No timeout, cancellation or abort anywhere
`grep AbortController|signal:` across `src/` returns **zero** hits. If OpenAI stalls, the
voice UI stays in `processing` forever with no cancel affordance and no recovery except
force-quit. Worst on the primary product path.

### F5 — P1 · `search_users` is a user/email enumeration oracle
`SECURITY DEFINER`, reads `auth.users`, matches `ILIKE '%q%'` against name **and email**,
and returns `email`. Verified with a brand-new account holding zero shares:

```
rpc/search_users {"search_query":"@"}
→ [{"email":"demo@wowtodo.local",...},{"email":"tester@wowtodo.local",...}]
```

`LIMIT 20` caps a page, not the attack — varying the substring walks the whole user base.
RLS on `user_profiles` is correct and returns `[]`; this function bypasses it by design.
On a public app this is a PII disclosure of every registered user's email.

### F6 — P2 · 3 `SECURITY DEFINER` functions lack `SET search_path`
`get_or_create_user_profile`, `handle_share_insert`, `handle_share_status_update`.
The other 7 correctly set `search_path=public`.
**Exploitability is low here:** `pg_namespace` ACL shows `anon=U/authenticated=U` — usage
only, **no CREATE on public** — so an attacker cannot plant a shadowing object. Residual
risk is the `pg_temp` vector, impractical over PostgREST's pooled connections. Hardening,
not an active hole. Supabase's own linter flags this as `function_search_path_mutable`.

### F7 — P2 · Migrations do not follow the pack standard
0 of 12 carry the mandatory header; none are numbered; there is no register. The standard
itself says *"Do not change historical migration filenames simply to conform"*, so these
are grandfathered — but three are **unpaired with rollbacks**
(`add_task_groups`, `fix_rls_circular`, `fix_search_users`), and there is no numbered
baseline from which new migrations can start. Recommend the next migration be `0013`.

### F8 — P2 · `in_app_notifications` has no DELETE policy and no retention
SELECT + UPDATE only. Users cannot delete notifications and nothing prunes them; the
table grows without bound per user.

**Additionally (P3, non-security):** `CLAUDE.md` is stale — it lists `expo-av` in plugins
(now `expo-audio`) and states "No test runner or linter is configured" (jest + 12 tests
exist). Flagged for prompt 140.

---

## 6. Architecture strengths — preserve these

1. **Single data-access layer.** Every table read/write goes through `features/*/api.ts`
   React Query hooks. No screen calls `supabase.from()` directly. This is what makes the
   F1/F2 fixes tractable and centralised.
2. **RLS on all 8 tables, no exceptions**, with `SECURITY DEFINER` helpers
   (`is_task_shared_with`, `is_branch_visible_to`) deliberately breaking the circular
   policy dependency rather than weakening the policies.
3. **Clean logging.** All 27 `console.*` sites log operation names and error objects —
   no tokens, transcripts, emails or todo content. Unusual and worth protecting.
4. **AI keys are server-side** behind a JWT-verified, model-allow-listed proxy.
5. **Sensible cache policy** — 2 min stale / 7 day gc, `refetchOnReconnect: true`,
   `refetchOnWindowFocus: false`, mutations `retry: 0` so optimistic rollback owns failure.
6. **Reminder scheduling respects the OS cap** — 60-item rolling window with throttled
   top-up, batched upserts.

---

## 7. Unknowns to resolve before agentic voice work (prompt 210)

1. **Is the F1 write latitude intentional collaboration?** The policy is named "toggles
   todo completion" but permits full-row edit. Whether shared editing is a *feature* to
   scope properly or a *bug* to lock down changes the fix. **Owner input needed.**
2. **Is `search_users` returning email intentional?** Sharing is email-addressed, so some
   lookup is required — but returning email for arbitrary substrings is not necessary to
   support it. Exact-match-only would preserve the feature and close the oracle.
3. **No AI observability.** Nothing records prompt version, latency, token cost, fallback
   rate or failure reason. An agentic intent system cannot be evaluated or regression-
   tested without this. Blocks the 160 evaluation baseline.
4. **No idempotency on task creation.** If the network drops after the AI returns but
   before insert, the transcript is lost; a retry re-bills the AI call.
5. **Offline behaviour unverified.** Cache persists and `refetchOnReconnect` is set, but
   mutation queueing offline has never been tested.

---

## 8. Restrictions honoured

No migrations applied, no policies altered, no secrets rotated or printed, no provider
changes, no remote/production access. All testing was against the local mirror; the four
fixture rows and one test user created for F1/F5 verification were deleted (`auth.users`
back to 2).
