-- ============================================================
-- Rollback: Profile & Email-based Sharing Enhancements
-- Date: 2026-03-09
-- ============================================================

-- Remove the check constraint
ALTER TABLE public.shares
  DROP CONSTRAINT IF EXISTS shares_has_recipient;

-- Remove unique indexes
DROP INDEX IF EXISTS idx_shares_unique_task_email;
DROP INDEX IF EXISTS idx_shares_unique_task_recipient;

-- Restore original unique constraint
ALTER TABLE public.shares
  ADD CONSTRAINT shares_unique_task_recipient UNIQUE (task_id, recipient_id);

-- Make recipient_id NOT NULL again
ALTER TABLE public.shares
  ALTER COLUMN recipient_id SET NOT NULL;

-- Remove recipient_email column
ALTER TABLE public.shares
  DROP COLUMN IF EXISTS recipient_email;
