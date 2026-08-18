# Migration Register

Standard: [`02_MIGRATION_AND_ROLLBACK_STANDARD.md`](../../AI_CODER_PROMPTS/WOWTODO_REVIVAL_V1/00_COMMON/02_MIGRATION_AND_ROLLBACK_STANDARD.md)
Authoritative apply order: [`app/migrations/MIGRATION_ORDER.md`](../../app/migrations/MIGRATION_ORDER.md)
Runner: `npm run db:reset:local` (local only — resolves the container from
`supabase/config.toml` `project_id` and refuses anything else)

## Numbering status

The 12 existing migrations **predate this standard**: they carry no permanent number and
no mandatory header. The standard states *"Do not change historical migration filenames
simply to conform"*, so they are **grandfathered as 0001–0012** for register purposes
only — filenames are not being rewritten.

**0013 and 0014 are applied locally AND to cloud** (cloud: 2026-08-18, verified by schema
dump plus a rolled-back behavioural test).

**0015 is applied locally AND to cloud** (cloud: 2026-08-18). It was pushed *before* the
matching `ai-proxy` deploy, which is the required order: the function calls
`consume_ai_quota` and fails closed with a 503 if the RPC is absent, so deploying the
function first would have taken AI generation down. `db:diff:cloud` hashes identical
(`5736de1d4d29aa9a`, 40698 bytes both sides).

The next new migration must be **`0016`**.

## Register

Forward test = replays cleanly via `db:reset:local`. Rollback test = actually executed
against the local mirror and verified to restore prior behaviour.

| # | File | Purpose | Depends on | Rollback | Fwd | Rbk |
|---|---|---|---|---|---|---|
| 0001 | `supabase_schema.sql` | Base schema: `tasks`, `todos` | — | ❌ none | ✅ | — |
| 0002 | `supabase_migration_add_task_groups.sql` | `task_groups` + `tasks.group_id` | 0001 | ❌ **none** | ✅ | — |
| 0003 | `supabase_migration_add_user_profiles.sql` | `user_profiles` | 0001 | `supabase_rollback_user_profiles.sql` | ✅ | ⬜ |
| 0004 | `supabase_migration_reminders.sql` | `reminder_settings`, `scheduled_reminders` | 0001 | `supabase_migration_reminders_rollback.sql` | ✅ | ⬜ |
| 0005 | `supabase_migration_branches.sql` | `tasks.parent_todo_id`, `todos.is_branched`, sync triggers | 0001 | `supabase_rollback_branches.sql` | ✅ | ⬜ |
| 0006 | `supabase_migration_sharing.sql` | `shares`, `in_app_notifications` | 0001, 0003 | `supabase_rollback_sharing.sql` | ✅ | ⬜ |
| 0007 | `supabase_fix_rls_circular.sql` | Break circular RLS via definer helpers | 0006 | ❌ **none** | ✅ | — |
| 0008 | `supabase_fix_search_users.sql` | `JOIN` → `LEFT JOIN` so profile-less users are findable | 0003 | ❌ **none** | ✅ | — |
| 0009 | `supabase_migration_profiles_email.sql` | Email on profiles; email-based sharing | 0003 | `supabase_rollback_profiles_email.sql` | ✅ | ⬜ |
| 0010 | `supabase_migration_sharing_peek.sql` | `peek_shared_task_todos` | 0006 | `supabase_rollback_sharing_peek.sql` | ✅ | ⬜ |
| 0011 | `supabase_migration_bugfix_triggers.sql` | Fix share triggers when profile row absent | 0006 | `supabase_rollback_bugfix_triggers.sql` | ✅ | ⬜ |
| 0012 | `supabase_migration_get_profiles_by_ids.sql` | Batch profile lookup RPC | 0003 | `supabase_rollback_get_profiles_by_ids.sql` | ✅ | ⬜ |
| **0013** | `0013_restrict_shared_todo_updates_and_user_search.sql` | Fix F1 (recipient could seize a todo) and F5 (email harvesting) | 0006, 0008 | `0013_…rollback.sql` | ✅ | ✅ **tested** |
| **0014** | `0014_unblock_deleting_tasks_with_branches.sql` | Fix DF-1 — `tasks.parent_todo_id` RESTRICT → SET NULL, so a branched todo no longer makes its task undeletable | branches | `0014_…rollback.sql` | ✅ | ✅ **tested** |
| **0015** | `0015_ai_proxy_rate_limit.sql` | Fix F3 — per-user quota counters + `consume_ai_quota` RPC so `ai-proxy` has a spend bound | 0001 | `0015_…rollback.sql` | ✅ | ⬜ |

## Open items

| Item | Severity | Detail |
|---|---|---|
| 3 migrations have **no rollback** | P2 | 0002, 0007, 0008. Defect **F7** |
| 9 of 10 rollbacks remain **unexecuted** | P2 | Untested rollbacks are assumptions, not safety nets. **0013 was the first to complete the full loop**, and **0014 followed it** (forward → verify → rollback → confirm the defect returns → reapply → verify). The historical ones still have not run |
| 12 of 13 migrations lack the mandatory header | P2 | Grandfathered. **0013 carries it in full** and is the template for 0014+ |

## Rules for new migrations

1. Number `0015` onward, permanent, never reused.
2. Mandatory forward **and** rollback header (see the standard).
3. A truthful rollback is required. If reversal would destroy production data, use
   expand → backfill → verify → contract instead of pretending rollback is safe.
4. Verify on the local mirror: forward → verify → rollback → verify → reapply → test.
5. Add the row to this register **and** to `MIGRATION_ORDER.md`.
6. Regenerate types afterwards: `npm run gen:types`.

## Workflow — local and cloud are kept identical by the CLI

Migrations live in **`app/supabase/migrations/`** and are managed by the Supabase CLI.
`app/migrations/` now holds **rollbacks only**.

```bash
npm run db:reset:local   # replay every migration into the local database
npm run db:push          # apply pending migrations to cloud
npm run db:status        # local vs remote history, side by side
npm run db:diff:cloud    # prove the two schemas are identical
```

**Adding a migration:**

```bash
supabase migration new <name>        # creates supabase/migrations/<timestamp>_<name>.sql
# write the forward SQL, plus a rollback in app/migrations/rollbacks/
npm run db:reset:local && npm run verify:rls
npm run db:push
npm run db:diff:cloud                # must print IDENTICAL
npm run gen:types
```

**Rollbacks must never go in `supabase/migrations/`.** The CLI applies every `.sql` file in
that directory, so a rollback beside its forward migration would run in the same pass and
undo it.

The CLI does **not** need the database password for `--linked` commands — it provisions a
temporary login role from the management API token. If you ever apply SQL by hand instead,
use the **session** pooler on port **5432**; 6543 is the transaction pooler and is the
wrong place for DDL.

### Why this exists

Before 2026-08-18 there was no `supabase/migrations/` directory, so the CLI had no history
and nothing ever pushed local migrations to cloud. Migrations 0013 and 0014 passed locally
and were **absent from production for days**, leaving a P0 live. A green local reset was
never evidence about cloud.

Cloud history was reconciled with `supabase migration repair --status applied` for all 14
existing migrations — they were already applied, so marking them avoided re-running
non-idempotent SQL against a live database. `db push` then reported "Remote database is up
to date", and both schemas hash identically.

## Local reset caveat

`db-reset-local.mjs` drops and recreates `public`, which **destroys Supabase's DEFAULT
PRIVILEGES**. Without restoring them every table has no grants and PostgREST returns
`42501 permission denied` — which looks exactly like an RLS bug but is not. The script
restores them explicitly; do not remove that block.
