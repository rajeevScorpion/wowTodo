-- ============================================================
-- Reminders Feature Migration
-- Run this in Supabase SQL Editor
-- Adds: event_time on tasks, due_date/due_time on todos,
--        reminder_settings table, scheduled_reminders table
-- ============================================================

-- 1. Add event_time to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS event_time timestamptz DEFAULT NULL;

-- 2. Add due_date and due_time to todos table
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS due_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS due_time time DEFAULT NULL;

-- 3. Create reminder_settings table
-- group_id = NULL means global default; non-null = per-group override
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.task_groups(id) ON DELETE CASCADE,
  slot1_minutes_before integer DEFAULT 15,
  slot1_type text DEFAULT 'notification' CHECK (slot1_type IN ('notification', 'alarm', 'both')),
  slot1_enabled boolean DEFAULT true,
  slot2_minutes_before integer DEFAULT NULL,
  slot2_type text DEFAULT 'notification' CHECK (slot2_type IN ('notification', 'alarm', 'both')),
  slot2_enabled boolean DEFAULT false,
  slot3_minutes_before integer DEFAULT NULL,
  slot3_type text DEFAULT 'notification' CHECK (slot3_type IN ('notification', 'alarm', 'both')),
  slot3_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: one row per (user, group) combo
-- For non-null group_id, the regular unique constraint works
ALTER TABLE public.reminder_settings
  ADD CONSTRAINT uq_reminder_settings_user_group UNIQUE (user_id, group_id);

-- For the global row (group_id IS NULL), we need a partial unique index
-- because PostgreSQL treats NULLs as distinct in unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_settings_global
  ON public.reminder_settings(user_id) WHERE group_id IS NULL;

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own reminder_settings"
  ON public.reminder_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE TRIGGER reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

-- 4. Create scheduled_reminders table
-- Tracks actually-scheduled local notifications for cancellation/sync
CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_id uuid NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  slot_number integer NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  fire_at timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN ('notification', 'alarm', 'both')),
  notification_id text,  -- expo-notifications identifier for local cancellation
  created_at timestamptz DEFAULT now(),
  UNIQUE(todo_id, slot_number)
);

ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own scheduled_reminders"
  ON public.scheduled_reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_todo
  ON public.scheduled_reminders(todo_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_fire
  ON public.scheduled_reminders(user_id, fire_at);

-- 5. Add index for todos with due dates (useful for reminder queries)
CREATE INDEX IF NOT EXISTS idx_todos_due_date
  ON public.todos(user_id, due_date) WHERE due_date IS NOT NULL;
