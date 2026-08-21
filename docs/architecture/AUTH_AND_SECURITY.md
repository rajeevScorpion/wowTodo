# Auth and Security

Verified 2026-08-17 against the live local mirror using real GoTrue-issued JWTs.
Full evidence: [120 audit](../audits/120_ARCHITECTURE_BACKEND_DATA_AND_SECURITY_AUDIT.md).

## Authentication

| Aspect | Implementation |
|---|---|
| Providers | **Google OAuth only** — email/password sign-in, sign-up and password reset were removed on 2026-08-18 |
| Session store | AsyncStorage via `createClient({ auth: { storage: AsyncStorage } })` |
| Refresh | `autoRefreshToken: true`; `startAutoRefresh`/`stopAutoRefresh` driven by `AppState` |
| Deep links | scheme `wowtodo`; `wowtodo://callback`, `exp://127.0.0.1:8081/--/callback` |
| Profile provisioning | `get_or_create_user_profile` on first sign-in |
| Sign-out | `supabase.auth.signOut()` only — ⚠️ **F2** |
| Account deletion | ✅ **Settings → Delete account** (`delete-account` Edge Function) — see below |

### Google-only sign-in

The app offers exactly one way in. This removes password storage, reset emails and the
"check your email to confirm" dead end from the product entirely, and it means the only
credential WowTodo ever handles is an OAuth token it did not mint.

Existing email/password accounts were **not** deleted. GoTrue links a Google identity onto
an existing user when the verified Google address matches the account email, so a user who
originally signed up with a Gmail address keeps their data and simply arrives via Google
instead. A user whose account email is not a Google-capable address would be locked out —
the split was not measurable from this machine (the management API token is unauthorized
here), so **confirm the provider breakdown in the dashboard before removing the email
provider server-side**.

The email provider is still enabled on both stacks. Removing the UI removes the product
surface, not the endpoint: `POST /auth/v1/signup` still works. Disabling it in the cloud
dashboard is the server-side half of this change and is an owner action, gated on the
check above. It must stay enabled on the **local** stack regardless — `npm run verify:rls`
builds its fixtures through the email signup and password-grant endpoints.

### Account deletion

Deleting an account is a **server-side** operation, in the `delete-account` Edge Function.
RLS lets a user delete their own rows, but nothing short of the service role can delete the
`auth.users` row — and leaving that behind means the account still exists and still signs
in. The function therefore holds the only privileged step, and takes the account to delete
from `/auth/v1/user` rather than from the request body, so there is no way to ask it to
delete anyone other than yourself.

One statement does the work — the admin delete of the auth row — and `on delete cascade`
fans it out to all ten tables that reference `auth.users` (ten since migration 0017 added
`ai_runs`).

`in_app_notifications` is the one table where the outcome depends on *which* column
references the departing user, and it has four:

| Column | Rule | Effect on a row in **someone else's** inbox |
|---|---|---|
| `user_id` | CASCADE | n/a — this is the user's own inbox |
| `share_id` | CASCADE | **row is deleted** — it described a share that no longer exists |
| `task_id` | CASCADE | **row is deleted** — it pointed at a task that no longer exists |
| `actor_id` | SET NULL | row survives, the link to the actor is severed |

Only the last of these was previously documented. The other two are second-order and were
surfaced by `verify:account-deletion` in 2026-08-20 when a new row-count assertion showed
the table losing three rows where the naive model predicted two. The behaviour is correct
— a *"Vic shared 'Dinner Party' with you"* notification whose share and task are both gone
deep-links to nothing — but it means deleting an account **can** remove notification rows
from other users' inboxes, and that is worth stating plainly rather than discovering.

That cascade needed a privilege fix (migration 0016). The RI trigger runs as
`supabase_auth_admin`, which had **no grants at all** in `public` on either stack, so the
first cascading delete was denied and GoTrue returned `Database error deleting user`. This
was verified to be true of the **cloud** project as well, not just locally.

Both halves are covered: `npm run verify:account-deletion` drives the real function against
a real database and asserts both that the user's data is gone and that a second user's data
survives; 7 jest tests cover what the device is left holding afterwards.

The suite asserts **deletion, not merely absence**. Counting rows `where user_id =
'<victim>'` cannot distinguish a deleted row from one whose `user_id` was set to NULL —
under `ON DELETE SET NULL` the data is still in the database and the count is still zero.
Each table's total row count is therefore compared before and after. Proven by mutation:
flipping `ai_runs` to `SET NULL` passes the per-column check and fails the row-count one.

## Secret placement

| Secret | Location | Ships to device? |
|---|---|---|
| Supabase anon key | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Yes — by design.** Public; RLS is the actual control |
| Supabase service_role | not used by the app | No |
| `OPENAI_API_KEY` | `ai-proxy` Edge Function env | **No** |
| `GEMINI_API_KEY` | `ai-proxy` Edge Function env | **No** |
| `SUPABASE_SERVICE_ROLE_KEY` | platform-injected into Edge Functions only | **No** |

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
