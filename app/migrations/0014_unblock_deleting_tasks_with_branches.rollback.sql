-- WowToDo Rollback Migration
-- Migration Number: 0014
-- Migration Identifier: 0014_unblock_deleting_tasks_with_branches
-- Title: Restore ON DELETE RESTRICT on tasks.parent_todo_id
-- Reverses: migrations/0014_unblock_deleting_tasks_with_branches.sql
--
-- ⚠️ BEHAVIOUR WARNING — this rollback deliberately REINSTATES a known P1 defect.
--
--    With RESTRICT back in place, any task containing a branched todo becomes
--    permanently undeletable again: the delete fails with 23503 / HTTP 409 and the
--    client rolls back silently, so the task appears to vanish and then returns with
--    no explanation (DF-1).
--
--    Only run this if the SET NULL behaviour is itself causing a worse problem.
--
-- Data Risk: LOW. No rows are deleted or rewritten.
--
--            One caveat specific to rolling back: any branch task that was already
--            orphaned while 0014 was live has `parent_todo_id IS NULL`. Those rows
--            satisfy the restored constraint (NULL is always accepted by a foreign
--            key) and are left exactly as they are. They will NOT be re-linked to
--            their original parent — that information is gone, because the parent
--            todo was deleted. This is not reversible, which is the main reason to
--            think twice before rolling back rather than fixing forward.
--
-- Pre-Rollback Checks:
--   1. Count the rows this will affect and be sure it is acceptable:
--        select count(*) from public.tasks
--        where parent_todo_id is null and id in (select task_id from public.todos);
--   2. Confirm no application code has started to rely on orphaned branch tasks.
-- Post-Rollback Verification:
--   1. confdeltype for tasks_parent_todo_id_fkey is 'r' (RESTRICT)
--   2. Deleting a task whose todo has a branch raises 23503 again (the defect)
-- Author/Agent: Claude Opus 5 (prompt pack WOWTODO_REVIVAL_V1, release plan slice 7)
-- Created: 2026-08-18

begin;

alter table public.tasks
    drop constraint if exists tasks_parent_todo_id_fkey;

alter table public.tasks
    add constraint tasks_parent_todo_id_fkey
    foreign key (parent_todo_id)
    references public.todos(id)
    on delete restrict;

comment on constraint tasks_parent_todo_id_fkey on public.tasks is null;

commit;
