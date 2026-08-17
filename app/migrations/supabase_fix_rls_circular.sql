-- ============================================================
-- Fix: Circular RLS Policy References
-- Date: 2026-03-06
-- Description: Replaces inline subqueries in tasks/todos RLS
--   policies with SECURITY DEFINER helper functions to break
--   the circular dependency that prevents task loading.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Create SECURITY DEFINER helper functions
-- ────────────────────────────────────────────────────────────

-- Check if a task is directly shared with a user (accepted status)
CREATE OR REPLACE FUNCTION is_task_shared_with(p_task_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shares
    WHERE task_id = p_task_id
      AND recipient_id = p_user_id
      AND status = 'accepted'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if a task is a visible branch for a user
-- (branch of a shared task with include_branches = true)
CREATE OR REPLACE FUNCTION is_branch_visible_to(p_task_id UUID, p_parent_todo_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.todos pt
    JOIN public.tasks mother ON mother.id = pt.task_id
    JOIN public.shares s ON s.task_id = mother.id
    WHERE pt.id = p_parent_todo_id
      AND s.recipient_id = p_user_id
      AND s.status = 'accepted'
      AND s.include_branches = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ────────────────────────────────────────────────────────────
-- 2. Replace tasks RLS policy for recipient reads
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Recipient reads shared tasks" ON public.tasks;

CREATE POLICY "Recipient reads shared tasks"
  ON public.tasks FOR SELECT
  USING (
    is_task_shared_with(tasks.id, auth.uid())
    OR (
      tasks.parent_todo_id IS NOT NULL
      AND is_branch_visible_to(tasks.id, tasks.parent_todo_id, auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. Replace todos RLS policies for recipient access
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Recipient reads shared todos" ON public.todos;

CREATE POLICY "Recipient reads shared todos"
  ON public.todos FOR SELECT
  USING (
    is_task_shared_with(todos.task_id, auth.uid())
  );

DROP POLICY IF EXISTS "Recipient toggles todo completion" ON public.todos;

CREATE POLICY "Recipient toggles todo completion"
  ON public.todos FOR UPDATE
  USING (is_task_shared_with(todos.task_id, auth.uid()))
  WITH CHECK (is_task_shared_with(todos.task_id, auth.uid()));

DROP POLICY IF EXISTS "Recipient adds todos to shared tasks" ON public.todos;

CREATE POLICY "Recipient adds todos to shared tasks"
  ON public.todos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_task_shared_with(todos.task_id, auth.uid())
  );
