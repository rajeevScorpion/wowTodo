-- ============================================================
-- Rollback: Task Sharing Feature
-- Date: 2026-03-06
-- Description: Reverts all sharing infrastructure changes.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Remove Realtime publications
-- ────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.shares;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.in_app_notifications;
-- Note: we do NOT remove todos from realtime — it may have been added independently

-- ────────────────────────────────────────────────────────────
-- 2. Drop triggers
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_share_status_update ON public.shares;
DROP TRIGGER IF EXISTS on_share_insert ON public.shares;
DROP TRIGGER IF EXISTS shares_updated_at ON public.shares;

-- ────────────────────────────────────────────────────────────
-- 3. Drop trigger functions
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS handle_share_status_update();
DROP FUNCTION IF EXISTS handle_share_insert();
DROP FUNCTION IF EXISTS create_share_notification(UUID, TEXT, UUID, UUID, UUID, TEXT);

-- ────────────────────────────────────────────────────────────
-- 4. Drop user search RPC and RLS helper functions
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS search_users(TEXT);
DROP FUNCTION IF EXISTS is_task_shared_with(UUID, UUID);
DROP FUNCTION IF EXISTS is_branch_visible_to(UUID, UUID, UUID);

-- ────────────────────────────────────────────────────────────
-- 5. Restore original tasks RLS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner CRUD own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Recipient reads shared tasks" ON public.tasks;

CREATE POLICY "Users CRUD own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. Restore original todos RLS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner CRUD own todos" ON public.todos;
DROP POLICY IF EXISTS "Recipient reads shared todos" ON public.todos;
DROP POLICY IF EXISTS "Recipient toggles todo completion" ON public.todos;
DROP POLICY IF EXISTS "Recipient adds todos to shared tasks" ON public.todos;

CREATE POLICY "Users CRUD own todos"
  ON public.todos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 7. Drop notification policies and table
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users read own notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.in_app_notifications;
DROP TABLE IF EXISTS public.in_app_notifications CASCADE;

-- ────────────────────────────────────────────────────────────
-- 8. Drop share policies and table
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner full access on shares" ON public.shares;
DROP POLICY IF EXISTS "Recipient can read their shares" ON public.shares;
DROP POLICY IF EXISTS "Recipient can respond to share" ON public.shares;
DROP TABLE IF EXISTS public.shares CASCADE;

-- ────────────────────────────────────────────────────────────
-- 9. Remove avatar_url from user_profiles
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS avatar_url;
