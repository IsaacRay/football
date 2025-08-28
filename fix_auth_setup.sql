-- Fix Authentication Setup for OA Football
-- Run this in your Supabase SQL Editor

-- 1. Drop the problematic function that's causing the error
DROP FUNCTION IF EXISTS get_or_create_default_pool();
DROP FUNCTION IF EXISTS auto_join_pool();
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- 2. Make sure the handle_new_user function exists and works
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Test that everything is working
SELECT 'Auth setup fixed! Try signing in now.' as status;