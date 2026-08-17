-- Migration: Branching Feature
-- Adds parent_todo_id to tasks and is_branched to todos
-- Adds triggers for auto-syncing parent todo completion from branch items

-- 1. New columns
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_todo_id uuid REFERENCES public.todos(id) ON DELETE RESTRICT;

ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS is_branched boolean DEFAULT false;

-- 2. Index for efficient branch lookups
CREATE INDEX IF NOT EXISTS idx_tasks_parent_todo_id
  ON public.tasks(parent_todo_id) WHERE parent_todo_id IS NOT NULL;

-- 3. Trigger function: sync parent todo completion when branch todos are updated or inserted
CREATE OR REPLACE FUNCTION sync_parent_todo_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_todo_id uuid;
  v_all_complete boolean;
BEGIN
  -- Find if this todo's task has a parent_todo_id (i.e., is a branch task)
  SELECT parent_todo_id INTO v_parent_todo_id
  FROM public.tasks
  WHERE id = NEW.task_id;

  IF v_parent_todo_id IS NOT NULL THEN
    -- Check if ALL todos in this branch task are completed
    SELECT NOT EXISTS(
      SELECT 1 FROM public.todos
      WHERE task_id = NEW.task_id AND completed = false
    ) INTO v_all_complete;

    -- Update the parent todo's completed status to match
    UPDATE public.todos
    SET completed = v_all_complete
    WHERE id = v_parent_todo_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger: fire on todo completion toggle
CREATE TRIGGER sync_branch_completion
  AFTER UPDATE OF completed ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION sync_parent_todo_completion();

-- 5. Trigger: fire when a new todo is added to a branch task
CREATE TRIGGER sync_branch_completion_on_insert
  AFTER INSERT ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION sync_parent_todo_completion();

-- 6. Separate function for DELETE (uses OLD instead of NEW)
CREATE OR REPLACE FUNCTION sync_parent_on_todo_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_todo_id uuid;
  v_all_complete boolean;
  v_remaining_count integer;
BEGIN
  SELECT parent_todo_id INTO v_parent_todo_id
  FROM public.tasks
  WHERE id = OLD.task_id;

  IF v_parent_todo_id IS NOT NULL THEN
    -- Count remaining todos in the branch task
    SELECT COUNT(*) INTO v_remaining_count
    FROM public.todos WHERE task_id = OLD.task_id;

    IF v_remaining_count = 0 THEN
      -- No todos left in branch; mark parent as incomplete
      UPDATE public.todos SET completed = false WHERE id = v_parent_todo_id;
    ELSE
      -- Check if all remaining todos are complete
      SELECT NOT EXISTS(
        SELECT 1 FROM public.todos
        WHERE task_id = OLD.task_id AND completed = false
      ) INTO v_all_complete;
      UPDATE public.todos SET completed = v_all_complete WHERE id = v_parent_todo_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger: fire when a todo is deleted from a branch task
CREATE TRIGGER sync_branch_completion_on_delete
  AFTER DELETE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION sync_parent_on_todo_delete();
