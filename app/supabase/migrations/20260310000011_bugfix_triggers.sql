-- ────────────────────────────────────────────────────────────
-- Bugfix: handle_share_insert & handle_share_status_update
-- Problem: When user_profiles row doesn't exist for a user,
-- SELECT INTO returns no rows → v_actor_name stays NULL →
-- NULL || '...' = NULL → NOT NULL constraint violation on body.
-- Fix: Add IF NULL fallback after each SELECT INTO.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_share_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_task_title TEXT;
  v_actor_name TEXT;
BEGIN
  SELECT title INTO v_task_title
    FROM public.tasks WHERE id = NEW.task_id;
  IF v_task_title IS NULL THEN v_task_title := 'a task'; END IF;

  SELECT COALESCE(full_name, 'Someone') INTO v_actor_name
    FROM public.user_profiles WHERE user_id = NEW.owner_id;
  IF v_actor_name IS NULL THEN v_actor_name := 'Someone'; END IF;

  PERFORM create_share_notification(
    NEW.recipient_id,
    'share_received',
    NEW.id,
    NEW.task_id,
    NEW.owner_id,
    v_actor_name || ' shared "' || v_task_title || '" with you'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  IF v_task_title IS NULL THEN v_task_title := 'a task'; END IF;

  IF NEW.status = 'accepted' THEN
    SELECT COALESCE(full_name, 'Someone') INTO v_actor_name
      FROM public.user_profiles WHERE user_id = NEW.recipient_id;
    IF v_actor_name IS NULL THEN v_actor_name := 'Someone'; END IF;

    PERFORM create_share_notification(
      NEW.owner_id,
      'share_accepted',
      NEW.id,
      NEW.task_id,
      NEW.recipient_id,
      v_actor_name || ' accepted your share of "' || v_task_title || '"'
    );

  ELSIF NEW.status = 'rejected' THEN
    SELECT COALESCE(full_name, 'Someone') INTO v_actor_name
      FROM public.user_profiles WHERE user_id = NEW.recipient_id;
    IF v_actor_name IS NULL THEN v_actor_name := 'Someone'; END IF;

    PERFORM create_share_notification(
      NEW.owner_id,
      'share_rejected',
      NEW.id,
      NEW.task_id,
      NEW.recipient_id,
      v_actor_name || ' declined your share of "' || v_task_title || '"'
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
