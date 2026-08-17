-- ============================================================
-- Migration: Task Sharing Feature
-- Date: 2026-03-06
-- Description: Adds sharing infrastructure — shares table,
--   in_app_notifications table, avatar_url column, cross-user
--   RLS policies, user search RPC, notification triggers,
--   and Supabase Realtime enablement.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add avatar_url to user_profiles
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. Create shares table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shares (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')),
  include_branches BOOLEAN NOT NULL DEFAULT false,
  rejection_note   TEXT DEFAULT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT shares_unique_task_recipient UNIQUE (task_id, recipient_id)
);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shares_task_id
  ON public.shares(task_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner_id
  ON public.shares(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_shares_recipient_id
  ON public.shares(recipient_id, status);

-- Reuse existing handle_updated_at() for shares
CREATE TRIGGER shares_updated_at
  BEFORE UPDATE ON public.shares
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. Create in_app_notifications table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
               'share_received', 'share_accepted', 'share_rejected'
             )),
  share_id   UUID REFERENCES public.shares(id) ON DELETE CASCADE,
  task_id    UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.in_app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.in_app_notifications(user_id, read) WHERE read = false;

-- ────────────────────────────────────────────────────────────
-- 4. RLS policies for shares
-- ────────────────────────────────────────────────────────────

-- Owner: full access on their own share rows
CREATE POLICY "Owner full access on shares"
  ON public.shares FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Recipient: can read share rows directed at them
CREATE POLICY "Recipient can read their shares"
  ON public.shares FOR SELECT
  USING (auth.uid() = recipient_id);

-- Recipient: can update status and rejection_note (to accept/reject)
CREATE POLICY "Recipient can respond to share"
  ON public.shares FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- ────────────────────────────────────────────────────────────
-- 5. RLS policies for in_app_notifications
-- ────────────────────────────────────────────────────────────

CREATE POLICY "Users read own notifications"
  ON public.in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. SECURITY DEFINER helper functions for RLS
--    (Avoids circular RLS references between tasks ↔ todos)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_task_shared_with(p_task_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shares
    WHERE task_id = p_task_id
      AND recipient_id = p_user_id
      AND status = 'accepted'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

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
-- 7. Expand tasks RLS for shared access
-- ────────────────────────────────────────────────────────────

-- Drop the original single-user policy
DROP POLICY IF EXISTS "Users CRUD own tasks" ON public.tasks;

-- Owner: full CRUD (unchanged behavior)
CREATE POLICY "Owner CRUD own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recipient: SELECT on accepted shared tasks (uses helper functions)
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
-- 8. Expand todos RLS for shared access
-- ────────────────────────────────────────────────────────────

-- Drop the original single-user policy
DROP POLICY IF EXISTS "Users CRUD own todos" ON public.todos;

-- Owner: full CRUD (unchanged behavior)
CREATE POLICY "Owner CRUD own todos"
  ON public.todos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recipient: can SELECT todos of accepted shared tasks
CREATE POLICY "Recipient reads shared todos"
  ON public.todos FOR SELECT
  USING (
    is_task_shared_with(todos.task_id, auth.uid())
  );

-- Recipient: can UPDATE completed field on todos of accepted shared tasks
CREATE POLICY "Recipient toggles todo completion"
  ON public.todos FOR UPDATE
  USING (is_task_shared_with(todos.task_id, auth.uid()))
  WITH CHECK (is_task_shared_with(todos.task_id, auth.uid()));

-- Recipient: can INSERT new todos into accepted shared tasks
CREATE POLICY "Recipient adds todos to shared tasks"
  ON public.todos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_task_shared_with(todos.task_id, auth.uid())
  );

-- ────────────────────────────────────────────────────────────
-- 8. User search RPC (SECURITY DEFINER to bypass RLS)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION search_users(search_query TEXT)
RETURNS TABLE (
  user_id    UUID,
  full_name  TEXT,
  avatar_url TEXT,
  email      TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id AS user_id,
    up.full_name,
    up.avatar_url,
    au.email::TEXT
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON up.user_id = au.id
  WHERE
    au.id != auth.uid()
    AND (
      up.full_name ILIKE '%' || search_query || '%'
      OR au.email ILIKE '%' || search_query || '%'
    )
  LIMIT 20;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 9. Helper function to insert notifications
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_share_notification(
  p_user_id  UUID,
  p_type     TEXT,
  p_share_id UUID,
  p_task_id  UUID,
  p_actor_id UUID,
  p_body     TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.in_app_notifications
    (user_id, type, share_id, task_id, actor_id, body)
  VALUES
    (p_user_id, p_type, p_share_id, p_task_id, p_actor_id, p_body);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 10. Trigger: auto-notify recipient when a share is created
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_share_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_task_title TEXT;
  v_actor_name TEXT;
BEGIN
  SELECT title INTO v_task_title
    FROM public.tasks WHERE id = NEW.task_id;

  SELECT COALESCE(full_name, 'Someone') INTO v_actor_name
    FROM public.user_profiles WHERE user_id = NEW.owner_id;

  PERFORM create_share_notification(
    NEW.recipient_id,
    'share_received',
    NEW.id,
    NEW.task_id,
    NEW.owner_id,
    v_actor_name || ' shared "' || COALESCE(v_task_title, 'a task') || '" with you'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_share_insert
  AFTER INSERT ON public.shares
  FOR EACH ROW EXECUTE FUNCTION handle_share_insert();

-- ────────────────────────────────────────────────────────────
-- 11. Trigger: auto-notify owner when share is accepted/rejected
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_share_status_update()
RETURNS TRIGGER AS $$
DECLARE
  v_task_title TEXT;
  v_actor_name TEXT;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_task_title
    FROM public.tasks WHERE id = NEW.task_id;

  IF NEW.status = 'accepted' THEN
    SELECT COALESCE(full_name, 'Someone') INTO v_actor_name
      FROM public.user_profiles WHERE user_id = NEW.recipient_id;

    PERFORM create_share_notification(
      NEW.owner_id,
      'share_accepted',
      NEW.id,
      NEW.task_id,
      NEW.recipient_id,
      v_actor_name || ' accepted your share of "' || COALESCE(v_task_title, 'a task') || '"'
    );

  ELSIF NEW.status = 'rejected' THEN
    SELECT COALESCE(full_name, 'Someone') INTO v_actor_name
      FROM public.user_profiles WHERE user_id = NEW.recipient_id;

    PERFORM create_share_notification(
      NEW.owner_id,
      'share_rejected',
      NEW.id,
      NEW.task_id,
      NEW.recipient_id,
      v_actor_name || ' declined your share of "' || COALESCE(v_task_title, 'a task') || '"'
        || CASE
             WHEN NEW.rejection_note IS NOT NULL AND NEW.rejection_note != ''
             THEN ': "' || NEW.rejection_note || '"'
             ELSE ''
           END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_share_status_update
  AFTER UPDATE OF status ON public.shares
  FOR EACH ROW EXECUTE FUNCTION handle_share_status_update();

-- ────────────────────────────────────────────────────────────
-- 12. Enable Supabase Realtime on key tables
-- ────────────────────────────────────────────────────────────
-- NOTE: Run this in the Supabase SQL editor. If the publication
-- already includes these tables, these statements are safe no-ops.

ALTER PUBLICATION supabase_realtime ADD TABLE public.shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
