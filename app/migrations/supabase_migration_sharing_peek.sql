-- ============================================================
-- Migration: Sharing Peek & Task Title Access
-- Date: 2026-03-09
-- Description: Adds SECURITY DEFINER functions to allow
--   recipients to peek at pending shared tasks/todos and
--   fetch task titles for shares directed at them.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Function: Get task info for shares where user is recipient
--    (works for pending AND accepted shares, bypasses task RLS)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_shared_task_info(p_task_ids UUID[])
RETURNS TABLE (
  task_id     UUID,
  title       TEXT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS task_id,
    t.title,
    t.description
  FROM public.tasks t
  WHERE t.id = ANY(p_task_ids)
    AND EXISTS (
      SELECT 1 FROM public.shares s
      WHERE s.task_id = t.id
        AND s.recipient_id = auth.uid()
        AND s.status IN ('pending', 'accepted')
    );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. Function: Peek at todos for a pending shared task
--    (read-only, only for shares where user is recipient)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION peek_shared_task_todos(p_share_id UUID)
RETURNS TABLE (
  id        UUID,
  title     TEXT,
  completed BOOLEAN,
  "order"   INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Verify the share belongs to the caller and is pending
  SELECT s.task_id INTO v_task_id
  FROM public.shares s
  WHERE s.id = p_share_id
    AND s.recipient_id = auth.uid()
    AND s.status = 'pending';

  IF v_task_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    td.id,
    td.title,
    td.completed,
    td."order"
  FROM public.todos td
  WHERE td.task_id = v_task_id
  ORDER BY td."order" ASC, td.created_at ASC;
END;
$$;
