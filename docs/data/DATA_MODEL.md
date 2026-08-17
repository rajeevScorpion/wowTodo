# Data Model

Schema verified against the live local Supabase mirror on 2026-08-17, replayed from
[`app/migrations/`](../../app/migrations/). Full evidence including policy expressions:
[120 audit](../audits/120_ARCHITECTURE_BACKEND_DATA_AND_SECURITY_AUDIT.md).

## Tables

| Table | Owner column | RLS | Policies | Realtime | Purpose |
|---|---|---|---|---|---|
| `tasks` | `user_id` | ✅ | 2 | — | High-level goal from user input. `parent_todo_id` enables branches |
| `todos` | `user_id` | ✅ | 4 | ✅ | Actionable step. `due_date`, `due_time`, `is_branched`, `order` |
| `task_groups` | `user_id` | ✅ | 1 | — | User categories; AI suggests one at creation |
| `user_profiles` | `user_id` | ✅ | 3 | — | Name, avatar, DOB, profession, city, bio |
| `shares` | `owner_id`, `recipient_id` | ✅ | 3 | ✅ | pending → accepted / rejected / revoked; `include_branches` |
| `in_app_notifications` | `user_id` | ✅ | 2 | ✅ | Share lifecycle events |
| `reminder_settings` | `user_id` | ✅ | 1 | — | Flat `slot1_*`…`slot3_*` columns, optionally per group |
| `scheduled_reminders` | `user_id` | ✅ | 1 | — | Unique `(todo_id, slot_number)` |

**Every table has RLS enabled and at least one policy. No table is world-readable.**
No storage buckets exist.

> ⚠️ `reminder_settings` stores **flat** `slot1_*`/`slot2_*`/`slot3_*` columns, but
> application code expects a `slots` array. Raw rows must go through `rowToReminderSettings`
> before use — bypassing it is a silent bug the type system will not catch unless the row
> is typed as `Database['public']['Tables']['reminder_settings']['Row']`.

## Relationships

```
auth.users
   ├─< user_profiles            (1:1)
   ├─< task_groups              (1:N)
   └─< tasks                    (1:N)
          ├─ group_id ──────────> task_groups
          ├─ parent_todo_id ────> todos        ← branch: a todo becomes a task
          └─< todos             (1:N)
                 └─< scheduled_reminders (1:N, ≤3 slots)

shares:  task_id ─> tasks · owner_id ─> auth.users · recipient_id ─> auth.users
```

## Functions

13 total, **10 `SECURITY DEFINER`**. The definer functions exist deliberately — they break
circular RLS dependencies (a policy on `tasks` needing to read `shares`, whose policy
needs to read `tasks`) without weakening either policy.

| Function | Purpose |
|---|---|
| `is_task_shared_with` | Policy helper — breaks the circular dependency |
| `is_branch_visible_to` | Policy helper for branch tasks |
| `get_or_create_user_profile` | Auto-provision profile on first sign-in |
| `get_profiles_by_ids` | Batch profile lookup for collaborator lists |
| `get_shared_task_info` | Task titles for shared tasks |
| `peek_shared_task_todos` | Preview todos before accepting a share |
| `search_users` | Find users to share with — ⚠️ **defect F5** |
| `create_share_notification` | Insert notification rows |
| `handle_share_insert` / `handle_share_status_update` | Share lifecycle triggers |
| `handle_updated_at` | `updated_at` maintenance (invoker) |
| `sync_parent_todo_completion` / `sync_parent_on_todo_delete` | Branch completion sync (invoker) |

7 of the 10 definer functions set `search_path=public`. Three do not — defect **F6**
(low exploitability: `authenticated` has no `CREATE` on `public`).

## Access model

Ownership is `auth.uid() = user_id` on every table. Collaboration is layered on top via
`shares` + the two definer policy helpers.

Verified negative cases: a non-owner reads `[]`; anon reads `[]`; a new user reads `[]`
from `user_profiles`.

Verified **failures**: `search_users` returns all users' emails to anyone (**F5**), and a
share recipient can rewrite and reassign the owner's todo (**F1, P0**).

## Migrations

12 migrations, order recorded in
[MIGRATION_ORDER.md](../../app/migrations/MIGRATION_ORDER.md) and enforced by
`npm run db:reset:local`. Filenames carry no sequence, so **that file is authoritative**.
Register and standard compliance: [MIGRATION_REGISTER.md](MIGRATION_REGISTER.md).
