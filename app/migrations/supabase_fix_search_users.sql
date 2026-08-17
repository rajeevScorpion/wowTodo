-- Fix: search_users RPC not finding users without a user_profiles row
-- Changes JOIN to LEFT JOIN so users who haven't visited their profile are discoverable

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
