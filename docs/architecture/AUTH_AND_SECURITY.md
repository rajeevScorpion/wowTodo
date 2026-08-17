# Auth and Security

Verified 2026-08-17 against the live local mirror using real GoTrue-issued JWTs.
Full evidence: [120 audit](../audits/120_ARCHITECTURE_BACKEND_DATA_AND_SECURITY_AUDIT.md).

## Authentication

| Aspect | Implementation |
|---|---|
| Providers | Google OAuth (`expo-auth-session`) + email/password |
| Session store | AsyncStorage via `createClient({ auth: { storage: AsyncStorage } })` |
| Refresh | `autoRefreshToken: true`; `startAutoRefresh`/`stopAutoRefresh` driven by `AppState` |
| Deep links | scheme `wowtodo`; `wowtodo://callback`, `exp://127.0.0.1:8081/--/callback` |
| Profile provisioning | `get_or_create_user_profile` on first sign-in |
| Sign-out | `supabase.auth.signOut()` only — ⚠️ **F2** |
| Account deletion | ❌ **not implemented** — Google Play requires this |

## Secret placement

| Secret | Location | Ships to device? |
|---|---|---|
| Supabase anon key | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Yes — by design.** Public; RLS is the actual control |
| Supabase service_role | not used by the app | No |
| `OPENAI_API_KEY` | `ai-proxy` Edge Function env | **No** |
| `GEMINI_API_KEY` | `ai-proxy` Edge Function env | **No** |

Verified by scanning a real production bundle (`expo export`, 8.45 MB Hermes):
**1 JWT** (the anon key), **0** `sk-…`, **0** `AIza…`. Method validated with controls that
correctly found `whisper-1`, `supabase` and `tamagui`.

> Stale `EXPO_PUBLIC_OPENAI_API_KEY` / `EXPO_PUBLIC_GEMINI_API_KEY` entries remain in
> `app/.env`. They are **not** bundled (nothing references them) but should be deleted.
> See [ENVIRONMENT_VARIABLES.md](../engineering/ENVIRONMENT_VARIABLES.md).

## Row Level Security

RLS is enabled on **all 8 tables**, 17 policies total. Ownership is `auth.uid() = user_id`;
collaboration layers on via `shares` and two `SECURITY DEFINER` policy helpers.

### Verified access matrix

| Test | Expected | Observed |
|---|---|---|
| Owner reads own rows | allowed | ✅ |
| Non-owner reads another's todos | `[]` | ✅ |
| Anon reads todos | `[]` | ✅ |
| New user reads `user_profiles` | `[]` | ✅ |
| New user calls `search_users('@')` | own results only | ❌ **all users + emails** (F5) |
| Recipient edits shared todo `title` | denied | ❌ **allowed** (F1) |
| Recipient sets shared todo `user_id` to self | denied | ❌ **allowed** (F1) |

## Open security defects

| ID | Sev | Summary |
|---|---|---|
| **F1** | **P0** | Recipient UPDATE policy constrains *who*, not *which columns*. `WITH CHECK` does not pin `user_id`, so a recipient can seize the owner's todo. Verified: after the change, owner sees 0 rows, recipient sees 1 |
| **F2** | P1 | Sign-out clears neither the AsyncStorage-persisted query cache (7-day `gcTime`) nor scheduled notifications. Next user on the device sees the previous user's tasks; previous user's reminders keep firing their private titles on the lock screen |
| **F3** | P1 | `ai-proxy` has no rate limit or body-size cap |
| **F5** | P1 | `search_users` is `SECURITY DEFINER`, reads `auth.users`, `ILIKE '%q%'` on name *and* email, returns email. `LIMIT 20` caps a page, not the attack |
| **F6** | P2 | 3 definer functions lack `SET search_path`. Low exploitability — `authenticated` has `USAGE` but **no `CREATE`** on `public`, so nothing can be planted |

## Security strengths — preserve

1. RLS on every table, no exceptions.
2. Definer helpers used to break circular policy dependencies rather than weakening policies.
3. **Clean logging** — all 27 `console.*` sites log operation names and error objects only.
   No tokens, transcripts, emails or todo content. Verify this holds when adding telemetry.
4. AI keys server-side behind a JWT-verified, model-allow-listed proxy, with validation
   ordered *before* key lookup so an invalid model cannot probe key presence.
5. Release manifest carries no `SYSTEM_ALERT_WINDOW`, no storage permissions, no
   `QUERY_ALL_PACKAGES`, no Play-restricted `USE_EXACT_ALARM`, and no cleartext traffic.
