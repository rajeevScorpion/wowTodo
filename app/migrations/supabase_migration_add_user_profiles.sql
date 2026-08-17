-- ============================================================
-- User Profiles Table Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop existing table if it exists (for re-running migration)
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ============================================================
-- USER_PROFILES TABLE
-- Stores user profile information: Name, DOB, Profession, City, Bio
-- ============================================================
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  date_of_birth DATE,
  profession TEXT,
  city TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

-- Unique index on user_id (one profile per user)
CREATE UNIQUE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Index for created_at queries
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at DESC);

-- ============================================================
-- TRIGGER for updated_at
-- ============================================================

-- Reuse existing trigger function if available, otherwise create it
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profiles
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- HELPER FUNCTION: Get or create user profile
-- ============================================================

CREATE OR REPLACE FUNCTION get_or_create_user_profile(p_user_id UUID)
RETURNS public.user_profiles AS $$
DECLARE
  v_profile public.user_profiles;
BEGIN
  -- Try to get existing profile
  SELECT * INTO v_profile
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  -- If not found, create a new one
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_profile;
  END IF;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
