-- ============================================================
-- Reminders Feature ROLLBACK
-- Run this in Supabase SQL Editor to undo the reminders migration
-- ============================================================

-- 1. Drop scheduled_reminders table (drop policies, indexes, then table)
DROP POLICY IF EXISTS "Users CRUD own scheduled_reminders" ON public.scheduled_reminders;
DROP INDEX IF EXISTS idx_scheduled_reminders_todo;
DROP INDEX IF EXISTS idx_scheduled_reminders_fire;
DROP TABLE IF EXISTS public.scheduled_reminders;

-- 2. Drop reminder_settings table (drop trigger, policies, indexes, then table)
DROP TRIGGER IF EXISTS reminder_settings_updated_at ON public.reminder_settings;
DROP POLICY IF EXISTS "Users CRUD own reminder_settings" ON public.reminder_settings;
DROP INDEX IF EXISTS idx_reminder_settings_global;
DROP TABLE IF EXISTS public.reminder_settings;

-- 3. Remove due_date and due_time from todos
ALTER TABLE public.todos
  DROP COLUMN IF EXISTS due_date,
  DROP COLUMN IF EXISTS due_time;

DROP INDEX IF EXISTS idx_todos_due_date;

-- 4. Remove event_time from tasks
ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS event_time;
