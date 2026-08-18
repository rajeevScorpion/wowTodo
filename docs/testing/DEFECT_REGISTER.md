# Defect Register

Open defects as of 2026-08-17. Severity: **P0** blocks release outright · **P1** must fix
before release · **P2** should fix · **P3** cosmetic/hygiene.

Evidence for F1–F8: [120 audit](../audits/120_ARCHITECTURE_BACKEND_DATA_AND_SECURITY_AUDIT.md).
Triage and fix plan: prompt 180.

| ID | Sev | Area | Summary | Status |
|---|---|---|---|---|
| ~~F1~~ | ~~P0~~ | RLS | Share recipient can rewrite and seize ownership of the owner's todo | ✅ **FIXED** — migration 0013 |
| **F2** | P1 | Auth | Sign-out leaves previous user's cached data and reminders on device | OPEN |
| **F3** | P1 | Backend | `ai-proxy` has no rate limit or body-size cap | OPEN |
| **F4** | P1 | Reliability | No timeouts or cancellation anywhere | OPEN |
| ~~F5~~ | ~~P1~~ | Privacy | `search_users` discloses every user's email | ✅ **FIXED** — migration 0013 |
| **D1** | P1 | Play policy | No in-app account deletion path | OPEN |
| **D2** | P1 | Play policy | No privacy policy — blocks the Data Safety form | OPEN |
| **D3** | P1 | Build | `expo-asset` not a direct dependency (`expo-doctor` 17/18) | OPEN |
| **D4** | P1 | Release | Release build is debug-signed (Expo template default) | OPEN |
| **DF-1** | P1 | Branches | A task containing a branched todo **cannot be deleted** — 409, silently rolled back with no message | OPEN |
| ~~VE-1~~ | ~~P1~~ | AI prompt | Named weekdays resolved to the wrong date | ✅ **FIXED** — `dateContext.ts`, 0/9 → 9/9 |
| **VE-2** | P1 | AI prompt | Fabricates task lists from ambiguous/non-task speech; cannot ask for clarification | OPEN |
| **VE-3** | P2 | AI prompt | `[LANGUAGE: Hindi]` ignored for romanised Hinglish input — returns English | OPEN |
| **VE-4** | P2 | AI prompt | Over-decomposes atomic tasks and invents unstated specifics | OPEN |
| **F6** | P2 | Hardening | 3 `SECURITY DEFINER` functions lack `SET search_path` | OPEN |
| **DF-2** | P2 | Validation | Empty titles accepted; render as blank ghost cards | OPEN |
| **DF-3** | P2 | Product | Analytics is a reachable "Coming soon" stub | OPEN |
| **DF-4** | P2 | Sharing | Share-accepted notification says "Someone" instead of the actor's name | OPEN |
| **DF-5** | P2 | Validation | No title length limit (5000 chars accepted; UI truncates safely) | OPEN |
| **DF-6** | P3 | Branches | `is_branched` is client-maintained, not enforced by a trigger | OPEN |
| **F7** | P2 | Migrations | 3 migrations unpaired; 9 of 10 rollbacks still unexecuted | OPEN |
| **F8** | P2 | Data | `in_app_notifications` has no DELETE policy or retention | OPEN |
| ~~D5~~ | ~~P2~~ | Secrets | OpenAI/Gemini keys rotated **and old keys revoked** | ✅ **DONE** — verified: the old key now returns 401 |
| ~~D5b~~ | ~~P1~~ | Secrets | Cloud Edge Function secrets unset — production AI returned `503` | ✅ **FIXED** — secrets set + `ai-proxy` deployed, 5/5 verified in production |
| ~~D7~~ | ~~P1~~ | Release | `eas.json` set no `env` — a store build shipped with **no Supabase URL or key** | ✅ **FIXED** — `env` added to `preview` + `production` |
| **D8** | **P0?** | Schema | **Unverified whether migration 0013 (F1 + F5 fixes) is applied to the CLOUD database** | OPEN — needs owner |
| **D6** | P3 | Docs | `app/CLAUDE.md` stale: lists `expo-av`, claims no test runner | OPEN |

---

## Details for the highest-severity items

### VE-1 — P1 · Named weekdays resolve to the wrong date  ✅ FIXED

`buildUserMessage` sends `[CURRENT DATE: 2026-08-17]` with **no weekday**, and the model
cannot reliably derive day-of-week from a bare date. Verified deterministic — 3 runs each,
9/9 wrong:

| Input | Got | Weekday | Correct |
|---|---|---|---|
| "next Monday" | 2026-08-21 | Friday | 2026-08-24 |
| "this Saturday" | 2026-08-20 | Thursday | 2026-08-22 |
| "on Friday" | 2026-08-19 | Wednesday | 2026-08-21 |

Pure relative offsets were fine ("today" ✅, "next month" ✅) — only *named weekdays* failed.

**Resolved.** Adding the weekday to the tag changed nothing (byte-identical output, still
0/9) — the model cannot do calendar arithmetic reliably even when told the day. The
arithmetic now happens in `services/ai/dateContext.ts`, which supplies a resolved lookup
table. **0/9 → 9/9**, and 4/4 on the baseline's date cases. The same helper fixed a second
bug found along the way: the tag used `toISOString()` (UTC), dating every pre-05:30 task
in IST to the previous day.

### VE-2 — P1 · Fabrication instead of clarification

The system prompt mandates *"Prefer being helpful over asking for clarification"* and
*"Never refuse to generate output"*. So *"The weather is really nice today and I feel
happy"* becomes a 4-todo task list, and *"Sort out the thing for the place"* becomes 5
invented steps. There is also **no schema field** in which a clarifying question could be
returned — the pipeline is structurally incapable of asking one. Primary constraint for
the prompt-210 agentic design.

### DF-1 — P1 · Branched todos make their task undeletable

`tasks.parent_todo_id → todos.id` is **`ON DELETE RESTRICT`** while
`todos.task_id → tasks.id` is `CASCADE`. Deleting a task cascades into its todos and is
then blocked by the branch reference:

```
DELETE /tasks?id=eq.<task with a branched todo>  → HTTP 409  23503
```

`useDeleteTask`/`useDeleteTodo` optimistically remove the row, the request fails, and
`onError` rolls back **with no toast or alert** (`_err` is unused). The user sees the task
vanish and silently reappear; it is permanently undeletable until the branch is unlinked,
and nothing says so. The delete affordance is offered unconditionally —
`TodoItem.tsx:105` uses `is_branched` only to gate the checkbox.

Full evidence: [150 audit](../audits/150_FEATURE_REGRESSION_AND_EDGE_CASE_AUDIT.md).

### F1 — P0 · Recipient can seize the owner's todo  ✅ FIXED (migration 0013)

The `todos` recipient-UPDATE policy uses `is_task_shared_with(task_id, auth.uid())` for
both `USING` and `WITH CHECK`. It constrains **who** may update, never **which columns**,
and does not pin `user_id`. Reproduced through PostgREST as an accepted recipient:

```
PATCH /todos {"title":"HIJACKED by recipient"}  → 200 applied
PATCH /todos {"user_id":"<recipient uuid>"}     → 200 applied
→ under RLS: owner sees 0 rows, recipient sees 1
```

Silent, permanent, no audit trail, no notification. Also allows rewriting `due_date`, and
moving `user_id` re-points reminder scheduling.

**Resolved.** Owner decision: recipient editing was a bug, not a feature. A `BEFORE UPDATE`
trigger now restricts non-owners to the `completed` column, comparing the whole row via
`to_jsonb` minus the allowed keys — so columns added by future migrations are protected by
default rather than silently becoming writable. Verified 17/17 in `npm run verify:rls`:
recipients can still toggle completion, owners are unaffected.

### F2 — P1 · Sign-out leaves data behind

`onAuthStateChange` discards the event, so `SIGNED_OUT` triggers nothing. Three consequences:

1. Query cache is **persisted to AsyncStorage** (`wowtodo-query-cache`, 7-day `gcTime`) and
   never cleared — the next account on the device rehydrates the previous user's tasks.
2. Scheduled notifications are never cancelled — the previous user's reminders keep firing,
   showing their private todo titles on the lock screen.
3. `clearReminderSettingsCache()` exists with **zero call sites** repo-wide.

### F5 — P1 · Email enumeration  ✅ FIXED (migration 0013)

`search_users` is `SECURITY DEFINER`, reads `auth.users`, matches `ILIKE '%q%'` on name
**and** email, and returns email. A brand-new account with zero shares searching `"@"`
returned every registered user's email. `LIMIT 20` caps a page, not the attack.

RLS on `user_profiles` is correct and returns `[]`; this function bypassed it by design.

**Resolved.** Exact-email lookup still returns the address (the caller already has it);
name search returns the profile with `email` NULL; minimum 3-character query enforced
server-side. Both search modes in the UI still work, and shares are created with
`recipient_id` rather than the address, so nothing in the flow depended on it.

### D8 — P0? · Is the P0 fix actually live in production?

Migration `0013` fixed **F1 (P0)** and **F5 (P1)**. It was written, tested and verified
**against the local stack only** (`npm run verify:rls`, 17/17). There is **no evidence it
has ever been applied to the cloud database**, and three things make that plausible:

- there is no `supabase/migrations/` directory, so the CLI holds **no migration history**
  for the linked project — cloud schema changes have been applied by hand;
- `supabase/.temp/pooler-url` no longer authenticates (`password authentication failed`),
  so the schema could not be introspected;
- the CLI's access token lives in Windows Credential Manager, not on disk.

A behavioural probe of `search_users` via PostgREST returned 0 rows for `'@'`, `'a'` and
`'.com'` — **this is not evidence of the fix.** Called with the anon key, `auth.uid()` is
NULL, so the pre-0013 predicate `id <> auth.uid()` evaluates to NULL and filters every row
out. The vulnerable and fixed versions are indistinguishable from an unauthenticated call.

**If 0013 is not applied to cloud, F1 is live in production**: any share recipient can
rewrite and seize the owner's todo. Resolving this needs one of — the owner applying
`0013` in the Studio SQL editor, a working database password, or a cloud test account to
probe with a real authenticated JWT.

### D7 — P1 · A store build would have had no backend  ✅ FIXED

`.env` is gitignored, there is no `.easignore`, and `eas.json` declared no `env` on any
profile — so `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` were **undefined in an EAS build**.
Both consumers fall back to `|| ''` (`lib/supabase.ts:7-8`, `services/ai/proxy.ts:11-12`),
so the client would have been constructed against an empty URL and the shipped app would
have reached nothing at all. Invisible to `tsc`, jest and the local emulator, all of which
read the local `.env`.

Fixed by adding `env` to the `preview` and `production` profiles. `development` is left
untouched so the local `.env` still drives dev builds. The anon key is public by design —
it ships inside the APK regardless and is guarded by RLS, which is precisely why F1/F5
mattered.

---

## Resolved

| ID | Summary | Fixed in |
|---|---|---|
| — | `POST_NOTIFICATIONS` missing → notifications silently dead on Android 13+ | `2b2cbbb` |
| — | Reminders exceeded the OS 64-notification cap and were silently discarded | `2b2cbbb` |
| — | 24 TypeScript errors from an untyped client and drifted hand-written `Database` | `2b2cbbb` |
| — | AI keys shipped in the client bundle | `dbe7d52` |
| — | `supabase/.temp/pooler-url` (production DB password) about to be committed to a public repo | `dbe7d52` |
| — | `NoClassDefFoundError: AnyTypeCache` crash after splash (`expo-asset` skew) | `c3ce5c6` |
| — | "Cannot use shared object that was already released" on unmount | `c3ce5c6` |
| — | `42501` after local reset — `drop schema` destroyed Supabase DEFAULT PRIVILEGES | `c3ce5c6` |
| — | Deprecated `expo-av` | `c3ce5c6` |
| VE-1 | Named weekdays resolved to the wrong date (0/9 → 9/9) | `4558887` |
| INF-1 | **Gemini fallback was dead** — `gemini-2.0-flash` retired by Google (404). When OpenAI failed there was no fallback, only a generic error. Proxy now tries `gemini-flash-latest`, then `gemini-3-flash-preview`, retrying on 404/503 only | `f6a7f3c` |
| INF-2 | Supabase CLI was unpinned and resolved by npm cache state; clearing the cache pulled 2.114.0 and broke the local stack | `f6a7f3c` |
| INF-3 | storage-api blocked local startup; unused service disabled | `f6a7f3c` |
| F1 | **P0** — share recipient could rewrite and seize the owner's todo. Fixed by a `BEFORE UPDATE` trigger restricting non-owners to `completed`; verified the recipient can still toggle completion and the owner is unaffected | migration `0013` |
| D5b | Cloud Edge Function secrets were unset, so production AI returned `503`. `supabase secrets set --env-file` + `functions deploy ai-proxy`. Verified in production 5/5: unauth 401 · disallowed model 400 · unknown target 400 · **real completion 200** · Gemini key present | (deploy) |
| D7 | `eas.json` had no `env`, so a store build would have shipped with no Supabase URL or anon key and reached nothing | (this commit) |
| F5 | **P1** — `search_users` email harvesting. Exact-email lookup still returns the address (the caller already has it); name search returns the profile with `email` NULL. Minimum 3-character query enforced server-side | migration `0013` |
