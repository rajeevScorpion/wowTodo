# Migration Order

The SQL files in this folder are **not** self-ordering — their filenames carry no
sequence number or timestamp, and several depend on objects created by earlier
files. Applying them alphabetically will fail.

This is the authoritative order. It was derived from git history in the original
`goodtodo` repository by recording the commit in which each file first appeared
(`git log --reverse --diff-filter=A -- '*.sql'`), so it reflects the order in
which the migrations were actually written and applied.

| # | Forward migration | Rollback | First committed |
|---|---|---|---|
| 1 | `supabase_schema.sql` (base: tasks, todos) | — (base schema) | 2026-02-10 |
| 2 | `supabase_migration_add_task_groups.sql` | ❌ none | 2026-02-20 |
| 3 | `supabase_migration_add_user_profiles.sql` | `supabase_rollback_user_profiles.sql` | 2026-02-24 |
| 4 | `supabase_migration_reminders.sql` | `supabase_migration_reminders_rollback.sql` | 2026-02-27 |
| 5 | `supabase_migration_branches.sql` | `supabase_rollback_branches.sql` | 2026-03-02 |
| 6 | `supabase_migration_sharing.sql` | `supabase_rollback_sharing.sql` | 2026-03-06 |
| 7 | `supabase_fix_rls_circular.sql` | ❌ none | 2026-03-06 |
| 8 | `supabase_fix_search_users.sql` | ❌ none | 2026-03-06 |
| 9 | `supabase_migration_profiles_email.sql` | `supabase_rollback_profiles_email.sql` | 2026-03-09 |
| 10 | `supabase_migration_sharing_peek.sql` | `supabase_rollback_sharing_peek.sql` | 2026-03-09 |
| 11 | `supabase_migration_bugfix_triggers.sql` | `supabase_rollback_bugfix_triggers.sql` | 2026-03-10 |
| 12 | `supabase_migration_get_profiles_by_ids.sql` | `supabase_rollback_get_profiles_by_ids.sql` | 2026-03-10 |

Items 11 and 12 arrived in the same commit (`6de1f8d`) and are independent of
each other.

## Known gaps

Three forward migrations have **no paired rollback** (#2, #7, #8). Per
`AI_CODER_PROMPTS/WOWTODO_REVIVAL_V1/00_COMMON/02_MIGRATION_AND_ROLLBACK_STANDARD.md`
every forward migration requires one. These are pre-existing and are tracked as a
P1 finding from the Prompt 100 audit — they are not retro-fitted here because
writing an untested rollback is worse than recording its absence.

## Applying to a local database

```bash
cd app
supabase start
npm run db:reset:local     # drops, recreates and applies every file in the order above
```

Existing filenames are deliberately **not** renamed to the pack's four-digit
numbering standard; that standard applies to migrations created from now on.
Renaming applied migrations would break the correspondence with the deployed
cloud database.
