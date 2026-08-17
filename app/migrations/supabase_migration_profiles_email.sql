-- ============================================================
-- Migration: Profile & Email-based Sharing Enhancements
-- Date: 2026-03-09
-- Description: Adds recipient_email column to shares table
--   for inviting unregistered users, and updates the unique
--   constraint to support email-based shares.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add recipient_email to shares (nullable, for unregistered users)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.shares
  ADD COLUMN IF NOT EXISTS recipient_email TEXT DEFAULT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. Make recipient_id nullable (for email-only invites)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.shares
  ALTER COLUMN recipient_id DROP NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 3. Update unique constraint to handle both registered + email invites
--    - Registered user: unique(task_id, recipient_id)
--    - Email invite: unique(task_id, recipient_email)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.shares
  DROP CONSTRAINT IF EXISTS shares_unique_task_recipient;

-- Unique for registered user shares
CREATE UNIQUE INDEX IF NOT EXISTS idx_shares_unique_task_recipient
  ON public.shares(task_id, recipient_id)
  WHERE recipient_id IS NOT NULL;

-- Unique for email-based invites
CREATE UNIQUE INDEX IF NOT EXISTS idx_shares_unique_task_email
  ON public.shares(task_id, recipient_email)
  WHERE recipient_email IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 4. Add check constraint: at least one of recipient_id or
--    recipient_email must be provided
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.shares
  ADD CONSTRAINT shares_has_recipient
  CHECK (recipient_id IS NOT NULL OR recipient_email IS NOT NULL);
