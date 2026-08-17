-- ============================================================
-- Rollback Migration: User Profiles Table
-- Run this in Supabase SQL Editor to rollback the user_profiles table
-- ============================================================

-- ============================================================
-- DROP TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;

-- ============================================================
-- DROP HELPER FUNCTION
-- ============================================================

DROP FUNCTION IF EXISTS get_or_create_user_profile(UUID);

-- ============================================================
-- DROP INDEXES
-- ============================================================

DROP INDEX IF EXISTS idx_user_profiles_created_at ON public.user_profiles;
DROP INDEX IF EXISTS idx_user_profiles_user_id ON public.user_profiles;

-- ============================================================
-- DROP RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- ============================================================
-- DISABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- DROP TABLE
-- ============================================================

DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ============================================================
-- ROLLBACK COMPLETE
-- ============================================================
-- The user_profiles table and all related objects have been removed.
-- ============================================================
