-- Setup script to create the default pool and ensure basic data exists
-- Run this in your Supabase SQL editor

-- First, make sure we have at least one user to be the admin
-- You'll need to replace the email with an actual user's email from auth.users
-- This query will find the first user and make them the pool admin
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the first user ID
    SELECT id INTO admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    -- Only insert if we have a user and no active pools exist
    IF admin_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pools WHERE is_active = true) THEN
        INSERT INTO pools (name, admin_id, starting_lives, current_week, is_active) 
        VALUES ('Olney Acres Football NFL Survivor Pool', admin_user_id, 3, 1, true);
        
        RAISE NOTICE 'Created default pool with admin: %', admin_user_id;
    ELSE
        RAISE NOTICE 'Default pool already exists or no users found';
    END IF;
END
$$;

-- Verify the setup
SELECT 
    p.name,
    u.email as admin_email,
    p.starting_lives,
    p.current_week,
    p.is_active,
    p.created_at
FROM pools p
JOIN auth.users u ON p.admin_id = u.id
WHERE p.is_active = true;