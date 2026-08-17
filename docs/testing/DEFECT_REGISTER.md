# Defect Register

Open defects as of 2026-08-17. Severity: **P0** blocks release outright · **P1** must fix
before release · **P2** should fix · **P3** cosmetic/hygiene.

Evidence for F1–F8: [120 audit](../audits/120_ARCHITECTURE_BACKEND_DATA_AND_SECURITY_AUDIT.md).
Triage and fix plan: prompt 180.

| ID | Sev | Area | Summary | Status |
|---|---|---|---|---|
| **F1** | **P0** | RLS | Share recipient can rewrite and seize ownership of the owner's todo | OPEN — needs owner decision |
| **F2** | P1 | Auth | Sign-out leaves previous user's cached data and reminders on device | OPEN |
| **F3** | P1 | Backend | `ai-proxy` has no rate limit or body-size cap | OPEN |
| **F4** | P1 | Reliability | No timeouts or cancellation anywhere | OPEN |
| **F5** | P1 | Privacy | `search_users` discloses every user's email | OPEN |
| **D1** | P1 | Play policy | No in-app account deletion path | OPEN |
| **D2** | P1 | Play policy | No privacy policy — blocks the Data Safety form | OPEN |
| **D3** | P1 | Build | `expo-asset` not a direct dependency (`expo-doctor` 17/18) | OPEN |
| **D4** | P1 | Release | Release build is debug-signed (Expo template default) | OPEN |
| **F6** | P2 | Hardening | 3 `SECURITY DEFINER` functions lack `SET search_path` | OPEN |
| **F7** | P2 | Migrations | 3 migrations unpaired; 0 rollbacks ever executed | OPEN |
| **F8** | P2 | Data | `in_app_notifications` has no DELETE policy or retention | OPEN |
| **D5** | P2 | Secrets | OpenAI/Gemini keys need rotation (exposed in retired `goodtodo` history) | OPEN — owner |
| **D6** | P3 | Docs | `app/CLAUDE.md` stale: lists `expo-av`, claims no test runner | OPEN |

---

## Details for the highest-severity items

### F1 — P0 · Recipient can seize the owner's todo

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

**Blocked on an owner decision:** is recipient *editing* intended collaboration (scope it
properly) or a bug (lock to `completed` only)? The answer changes the fix.

### F2 — P1 · Sign-out leaves data behind

`onAuthStateChange` discards the event, so `SIGNED_OUT` triggers nothing. Three consequences:

1. Query cache is **persisted to AsyncStorage** (`wowtodo-query-cache`, 7-day `gcTime`) and
   never cleared — the next account on the device rehydrates the previous user's tasks.
2. Scheduled notifications are never cancelled — the previous user's reminders keep firing,
   showing their private todo titles on the lock screen.
3. `clearReminderSettingsCache()` exists with **zero call sites** repo-wide.

### F5 — P1 · Email enumeration

`search_users` is `SECURITY DEFINER`, reads `auth.users`, matches `ILIKE '%q%'` on name
**and** email, and returns email. A brand-new account with zero shares searching `"@"`
returned every registered user's email. `LIMIT 20` caps a page, not the attack.

RLS on `user_profiles` is correct and returns `[]`; this function bypasses it by design.
Exact-match-only lookup would preserve email-based sharing and close the oracle.

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
