# Migration order — superseded

**Migrations now live in [`../supabase/migrations/`](../supabase/migrations/) and are
managed by the Supabase CLI.** Order is encoded in the filename timestamp, so there is no
longer a hand-maintained order list to keep in sync — that list was the thing that could
drift.

This directory now holds **rollbacks only** ([`rollbacks/`](rollbacks/)). Rollbacks must
never be placed in `supabase/migrations/`: the CLI applies every `.sql` file it finds
there, so a rollback sitting alongside its forward migration would be executed as part of
the migration run and immediately undo it.

## Commands

```bash
npm run db:reset:local   # supabase db reset  — replay every migration into local
npm run db:push          # supabase db push   — apply pending migrations to cloud
npm run db:status        # local vs remote migration history, side by side
npm run db:diff:cloud    # prove the local and cloud schemas are identical
```

## Renamed files

Kept for traceability with older commits and documents. Content was unchanged by the
rename — these are `git mv` moves.

| Old name (`app/migrations/`) | New name (`app/supabase/migrations/`) |
|---|---|
| `supabase_schema.sql` | `20260301000001_initial_schema.sql` |
| `supabase_migration_add_task_groups.sql` | `20260301000002_add_task_groups.sql` |
| `supabase_migration_add_user_profiles.sql` | `20260301000003_add_user_profiles.sql` |
| `supabase_migration_reminders.sql` | `20260301000004_reminders.sql` |
| `supabase_migration_branches.sql` | `20260301000005_branches.sql` |
| `supabase_migration_sharing.sql` | `20260301000006_sharing.sql` |
| `supabase_fix_rls_circular.sql` | `20260301000007_fix_rls_circular.sql` |
| `supabase_fix_search_users.sql` | `20260301000008_fix_search_users.sql` |
| `supabase_migration_profiles_email.sql` | `20260309000009_profiles_email.sql` |
| `supabase_migration_sharing_peek.sql` | `20260309000010_sharing_peek.sql` |
| `supabase_migration_bugfix_triggers.sql` | `20260310000011_bugfix_triggers.sql` |
| `supabase_migration_get_profiles_by_ids.sql` | `20260310000012_get_profiles_by_ids.sql` |
| `0013_restrict_shared_todo_updates_and_user_search.sql` | `20260817000013_restrict_shared_todo_updates_and_user_search.sql` |
| `0014_unblock_deleting_tasks_with_branches.sql` | `20260818000014_unblock_deleting_tasks_with_branches.sql` |

The first eight have no recorded date, so they were given ordered synthetic timestamps on
`2026-03-01` that preserve the sequence the project actually applied them in. Items 9-14
use their real dates from the previous version of this file.

Timestamps are **history**, not a claim about when the file was written. Do not renumber
them: the same values are recorded in the cloud project's
`supabase_migrations.schema_migrations` table, and changing one would make the CLI think a
migration is missing and try to apply it again.
