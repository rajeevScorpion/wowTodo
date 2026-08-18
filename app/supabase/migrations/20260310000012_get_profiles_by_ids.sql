-- ────────────────────────────────────────────────────────────
-- Migration: get_profiles_by_ids RPC function
-- Purpose: Allow authenticated users to look up public profile
-- fields (name, avatar) of other users for sharing features.
-- RLS on user_profiles blocks cross-user reads, so this
-- SECURITY DEFINER function bypasses RLS for minimal fields.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_profiles_by_ids(p_user_ids UUID[])
RETURNS TABLE (
  user_id    UUID,
  full_name  TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.full_name,
    up.avatar_url
  FROM public.user_profiles up
  WHERE up.user_id = ANY(p_user_ids);
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_profiles_by_ids(UUID[]) TO authenticated;
