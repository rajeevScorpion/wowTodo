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

**The next new migration must be `0013` and must fully comply** with the header, pairing
and register rules.

## Register

Forward test = replays cleanly via `db:reset:local`. Rollback test = never executed.

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

## Open items

| Item | Severity | Detail |
|---|---|---|
| 3 migrations have **no rollback** | P2 | 0002, 0007, 0008. Defect **F7** |
| 0 rollbacks have been **executed** | P2 | Untested rollbacks are assumptions, not safety nets. The standard's verification loop (forward → verify → rollback → verify → reapply) has never run |
| 0 migrations carry the mandatory header | P2 | Grandfathered; applies to 0013+ |

## Rules for new migrations

1. Number `0013` onward, permanent, never reused.
2. Mandatory forward **and** rollback header (see the standard).
3. A truthful rollback is required. If reversal would destroy production data, use
   expand → backfill → verify → contract instead of pretending rollback is safe.
4. Verify on the local mirror: forward → verify → rollback → verify → reapply → test.
5. Add the row to this register **and** to `MIGRATION_ORDER.md`.
6. Regenerate types afterwards: `npm run gen:types`.

## Local reset caveat

`db-reset-local.mjs` drops and recreates `public`, which **destroys Supabase's DEFAULT
PRIVILEGES**. Without restoring them every table has no grants and PostgREST returns
`42501 permission denied` — which looks exactly like an RLS bug but is not. The script
restores them explicitly; do not remove that block.
