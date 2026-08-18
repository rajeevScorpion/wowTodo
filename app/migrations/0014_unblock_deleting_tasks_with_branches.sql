-- WowToDo Forward Migration
-- Migration Number: 0014
-- Migration Identifier: 0014_unblock_deleting_tasks_with_branches
-- Title: Let a task be deleted when one of its todos has been branched
-- Purpose: Fixes audit finding DF-1 (P1) from prompt 150.
--          `tasks.parent_todo_id` references `todos(id)` ON DELETE RESTRICT while
--          `todos.task_id` references `tasks(id)` ON DELETE CASCADE. Deleting a task
--          cascades into its todos, and the cascade is then blocked by the branch
--          reference, so the DELETE aborts with 23503 / HTTP 409. The task is
--          permanently undeletable for as long as any of its todos has a branch.
--          The client deletes optimistically and rolls back on error without showing
--          a message, so the task visibly vanishes and silently reappears.
-- Depends On: supabase_migration_branches.sql (adds tasks.parent_todo_id)
-- Affected Objects:
--   ALTER TABLE public.tasks
--     DROP CONSTRAINT tasks_parent_todo_id_fkey,
--     ADD  CONSTRAINT tasks_parent_todo_id_fkey ... ON DELETE SET NULL
-- Data Risk: LOW, but not none. No rows are deleted, added or rewritten by this
--            migration itself. It changes what a *future* delete does: deleting a
--            parent todo will null the branch task's `parent_todo_id` instead of
--            failing. The branch task and all of its own todos survive as an
--            ordinary top-level task.
--
--            SET NULL was chosen over CASCADE deliberately. CASCADE would silently
--            destroy a branch task and every todo inside it when the user deleted an
--            unrelated parent task — real data loss from an action whose blast radius
--            is not visible in the UI. SET NULL loses only the parent link. It also
--            matches the existing precedent on this same table: `tasks_group_id_fkey`
--            is ON DELETE SET NULL, so deleting a group leaves its tasks intact and
--            ungrouped.
--
--            Orphaned branch tasks stay visible: the "Owner CRUD own tasks" policy is
--            `auth.uid() = user_id` and does not consider `parent_todo_id`. The
--            branch-specific SELECT policy is additive and only ever *granted* extra
--            visibility to share recipients, which correctly stops once the parent is
--            gone.
-- Rollback File: migrations/0014_unblock_deleting_tasks_with_branches.rollback.sql
-- Pre-Deployment Checks:
--   1. `npm run db:reset:local` applies cleanly through 0013.
--   2. Confirm the constraint is still named `tasks_parent_todo_id_fkey`:
--        select conname from pg_constraint
--        where conrelid = 'public.tasks'::regclass and contype = 'f';
-- Post-Deployment Verification:
--   1. confdeltype for tasks_parent_todo_id_fkey is 'n' (SET NULL), was 'r' (RESTRICT)
--   2. Deleting a task whose todo has a branch succeeds instead of raising 23503
--   3. The branch task still exists afterwards, with parent_todo_id IS NULL
--   4. The branch task's own todos still exist
-- Author/Agent: Claude Opus 5 (prompt pack WOWTODO_REVIVAL_V1, release plan slice 7)
-- Created: 2026-08-18

-- ─────────────────────────────────────────────────────────────────────────────
-- DF-1 — a branched todo must not make its task undeletable
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Dropped and recreated rather than altered: PostgreSQL has no
-- `ALTER CONSTRAINT ... ON DELETE` for foreign keys, so replacing it is the only
-- route. Both statements run in one transaction, so the table is never left
-- without the constraint.

begin;

alter table public.tasks
    drop constraint if exists tasks_parent_todo_id_fkey;

alter table public.tasks
    add constraint tasks_parent_todo_id_fkey
    foreign key (parent_todo_id)
    references public.todos(id)
    on delete set null;

comment on constraint tasks_parent_todo_id_fkey on public.tasks is
    'SET NULL, not RESTRICT: deleting a parent todo must not make its task '
    'undeletable (DF-1). The branch task survives as an ordinary task.';

commit;
