-- Clean up authentication setup for OA Football
-- Run this in your Supabase SQL Editor

-- 1. Drop triggers first (this removes the dependency)
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Now drop the functions
DROP FUNCTION IF EXISTS auto_join_pool();
DROP FUNCTION IF EXISTS get_or_create_default_pool();

-- 3. Create a simple, working handle_new_user function
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

-- 4. Create the trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Test
SELECT 'Authentication cleaned up and fixed!' as status;