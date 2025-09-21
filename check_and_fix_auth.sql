-- Check and Fix Auth Setup

-- 1. Check if profiles table exists and what's in it
SELECT COUNT(*) as profile_count FROM profiles;

-- 2. Check if the trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 3. Check existing policies
SELECT polname FROM pg_policy WHERE polrelid = 'profiles'::regclass;

-- 4. Check if pools table exists
SELECT COUNT(*) as pool_count FROM pools;

-- 5. If you need to reset and start fresh, uncomment and run these:
-- DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
-- DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();

-- 6. Create only what's missing
DO $$
BEGIN
    -- Create trigger function if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger AS $func$
        BEGIN
          INSERT INTO public.profiles (id, email, display_name)
          VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
          );
          RETURN new;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    END IF;

    -- Create trigger if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 7. Create default pool if none exists
INSERT INTO pools (name, starting_lives, current_week, is_active)
SELECT 'OA Football Survivor Pool 2025', 3, 1, true
WHERE NOT EXISTS (SELECT 1 FROM pools WHERE is_active = true);

-- 8. Show current status
SELECT 
    'Profiles: ' || COUNT(*)::text as profile_count,
    'Pools: ' || (SELECT COUNT(*) FROM pools)::text as pool_count,
    'Active Pools: ' || (SELECT COUNT(*) FROM pools WHERE is_active = true)::text as active_pools
FROM profiles;