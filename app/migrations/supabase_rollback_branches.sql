-- Rollback: Branching Feature
-- Reverses all changes from supabase_migration_branches.sql

-- Drop triggers first (they depend on the functions)
DROP TRIGGER IF EXISTS sync_branch_completion ON public.todos;
DROP TRIGGER IF EXISTS sync_branch_completion_on_insert ON public.todos;
DROP TRIGGER IF EXISTS sync_branch_completion_on_delete ON public.todos;

-- Drop functions
DROP FUNCTION IF EXISTS sync_parent_todo_completion();
DROP FUNCTION IF EXISTS sync_parent_on_todo_delete();

-- Drop index
DROP INDEX IF EXISTS idx_tasks_parent_todo_id;

-- Drop columns
ALTER TABLE public.todos DROP COLUMN IF EXISTS is_branched;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS parent_todo_id;
