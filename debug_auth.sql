-- Debug authentication issues
-- Run this in Supabase SQL Editor to check your setup

-- 1. Check if profiles table exists and has data
SELECT 'Profiles table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check existing profiles
SELECT 'Existing profiles:' as info;
SELECT id, email, display_name, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check if the trigger function exists
SELECT 'Trigger function exists:' as info;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- 4. Check if the trigger exists
SELECT 'Triggers on auth.users:' as info;
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- 5. Check RLS policies on profiles
SELECT 'RLS policies on profiles:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Test if we can manually insert a profile (replace with a real user ID from auth.users)
SELECT 'Testing manual profile creation:' as info;
-- Uncomment and modify this line with an actual user ID:
-- INSERT INTO profiles (id, email, display_name) VALUES ('test-uuid', 'test@example.com', 'Test User');