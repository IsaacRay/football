-- Debug script to check database setup
-- Run this in your Supabase SQL editor to diagnose issues

-- Check if tables exist
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE tablename IN ('pools', 'players', 'picks', 'games', 'teams')
ORDER BY tablename;

-- Check teams data
SELECT 'Teams count' as check_type, COUNT(*) as count FROM teams;

-- Check pools data
SELECT 'Pools count' as check_type, COUNT(*) as count FROM pools;
SELECT 'Active pools count' as check_type, COUNT(*) as count FROM pools WHERE is_active = true;

-- Check games data
SELECT 'Games count' as check_type, COUNT(*) as count FROM games;
SELECT 'Games for week 1' as check_type, COUNT(*) as count FROM games WHERE week_number = 1 AND season = 2025;

-- Check current user authentication
SELECT 'Current user' as check_type, auth.uid() as user_id;

-- Check if current user has any player records
SELECT 'Player records for current user' as check_type, COUNT(*) as count 
FROM players 
WHERE user_id = auth.uid();

-- Show all active pools with admin info (if any exist)
SELECT 
    p.id,
    p.name,
    u.email as admin_email,
    p.current_week,
    p.is_active
FROM pools p
LEFT JOIN auth.users u ON p.admin_id = u.id
WHERE p.is_active = true;

-- Show any error logs or issues
SELECT 
    'Recent auth users' as check_type, 
    COUNT(*) as count 
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '1 day';