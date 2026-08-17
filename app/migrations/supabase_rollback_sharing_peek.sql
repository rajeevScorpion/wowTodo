-- ============================================================
-- Rollback: Sharing Peek & Task Title Access
-- Date: 2026-03-09
-- ============================================================

DROP FUNCTION IF EXISTS peek_shared_task_todos(UUID);
DROP FUNCTION IF EXISTS get_shared_task_info(UUID[]);
