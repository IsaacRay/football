-- Additional schema for user profiles and authentication
-- Run this in addition to the main schema

-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the pools table to reference profiles instead of auth.users directly
ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_admin_id_fkey;
ALTER TABLE pools ADD CONSTRAINT pools_admin_id_fkey 
  FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_fkey;
ALTER TABLE players ADD CONSTRAINT players_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Function to get or create a default pool for new users
CREATE OR REPLACE FUNCTION get_or_create_default_pool()
RETURNS UUID AS $$
DECLARE
  pool_id UUID;
BEGIN
  -- Try to find an existing active pool
  SELECT id INTO pool_id
  FROM pools
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no pool exists, create a default one
  IF pool_id IS NULL THEN
    INSERT INTO pools (name, admin_id, starting_lives, current_week, is_active)
    VALUES (
      '2025 NFL Survivor Pool',
      (SELECT id FROM profiles LIMIT 1), -- Use first profile as admin
      3,
      1,
      true
    )
    RETURNING id INTO pool_id;
  END IF;
  
  RETURN pool_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically join user to default pool
CREATE OR REPLACE FUNCTION auto_join_pool()
RETURNS trigger AS $$
DECLARE
  default_pool_id UUID;
BEGIN
  -- Get or create default pool
  default_pool_id := get_or_create_default_pool();
  
  -- Add user to the pool
  INSERT INTO players (pool_id, user_id, display_name, lives_remaining, is_eliminated)
  VALUES (
    default_pool_id,
    NEW.id,
    NEW.display_name,
    3,
    false
  )
  ON CONFLICT (pool_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-join new users to default pool
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_join_pool();

-- Update players policies to use profiles
DROP POLICY IF EXISTS "Players are viewable by pool members" ON players;
CREATE POLICY "Players are viewable by pool members" ON players
  FOR SELECT USING (
    pool_id IN (
      SELECT pool_id FROM players WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Players can make picks" ON picks;
CREATE POLICY "Players can make picks" ON picks
  FOR INSERT WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Create a view for easy pool member lookup
CREATE OR REPLACE VIEW pool_members AS
SELECT 
  pl.id as player_id,
  pl.pool_id,
  pl.display_name,
  pl.lives_remaining,
  pl.is_eliminated,
  pl.joined_at,
  pr.email,
  pr.avatar_url
FROM players pl
JOIN profiles pr ON pl.user_id = pr.id;

-- Grant access to the view
GRANT SELECT ON pool_members TO authenticated;