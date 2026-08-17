-- Rollback: restore original trigger functions without NULL fallbacks

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

-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_share_status_update()
RETURNS TRIGGER AS $$
DECLARE
  v_task_title TEXT;
  v_actor_name TEXT;
BEGIN
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
