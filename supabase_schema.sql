-- Supabase SQL Schema for NFL Survivor Pool
-- With 3-Life System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(5) NOT NULL,
  conference VARCHAR(3) CHECK (conference IN ('AFC', 'NFC')),
  division VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert all 32 NFL teams
INSERT INTO teams (id, name, abbreviation, conference, division) VALUES
  ('buf', 'Buffalo Bills', 'BUF', 'AFC', 'East'),
  ('mia', 'Miami Dolphins', 'MIA', 'AFC', 'East'),
  ('ne', 'New England Patriots', 'NE', 'AFC', 'East'),
  ('nyj', 'New York Jets', 'NYJ', 'AFC', 'East'),
  ('bal', 'Baltimore Ravens', 'BAL', 'AFC', 'North'),
  ('cin', 'Cincinnati Bengals', 'CIN', 'AFC', 'North'),
  ('cle', 'Cleveland Browns', 'CLE', 'AFC', 'North'),
  ('pit', 'Pittsburgh Steelers', 'PIT', 'AFC', 'North'),
  ('hou', 'Houston Texans', 'HOU', 'AFC', 'South'),
  ('ind', 'Indianapolis Colts', 'IND', 'AFC', 'South'),
  ('jax', 'Jacksonville Jaguars', 'JAX', 'AFC', 'South'),
  ('ten', 'Tennessee Titans', 'TEN', 'AFC', 'South'),
  ('den', 'Denver Broncos', 'DEN', 'AFC', 'West'),
  ('kc', 'Kansas City Chiefs', 'KC', 'AFC', 'West'),
  ('lv', 'Las Vegas Raiders', 'LV', 'AFC', 'West'),
  ('lac', 'Los Angeles Chargers', 'LAC', 'AFC', 'West'),
  ('dal', 'Dallas Cowboys', 'DAL', 'NFC', 'East'),
  ('nyg', 'New York Giants', 'NYG', 'NFC', 'East'),
  ('phi', 'Philadelphia Eagles', 'PHI', 'NFC', 'East'),
  ('was', 'Washington Commanders', 'WAS', 'NFC', 'East'),
  ('chi', 'Chicago Bears', 'CHI', 'NFC', 'North'),
  ('det', 'Detroit Lions', 'DET', 'NFC', 'North'),
  ('gb', 'Green Bay Packers', 'GB', 'NFC', 'North'),
  ('min', 'Minnesota Vikings', 'MIN', 'NFC', 'North'),
  ('atl', 'Atlanta Falcons', 'ATL', 'NFC', 'South'),
  ('car', 'Carolina Panthers', 'CAR', 'NFC', 'South'),
  ('no', 'New Orleans Saints', 'NO', 'NFC', 'South'),
  ('tb', 'Tampa Bay Buccaneers', 'TB', 'NFC', 'South'),
  ('ari', 'Arizona Cardinals', 'ARI', 'NFC', 'West'),
  ('lar', 'Los Angeles Rams', 'LAR', 'NFC', 'West'),
  ('sf', 'San Francisco 49ers', 'SF', 'NFC', 'West'),
  ('sea', 'Seattle Seahawks', 'SEA', 'NFC', 'West');

-- Pools table
CREATE TABLE IF NOT EXISTS pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  starting_lives INTEGER DEFAULT 3 CHECK (starting_lives > 0),
  current_week INTEGER DEFAULT 1 CHECK (current_week > 0 AND current_week <= 18),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table (participants in pools)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  lives_remaining INTEGER DEFAULT 3 CHECK (lives_remaining >= 0),
  is_eliminated BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, user_id)
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number > 0 AND week_number <= 18),
  home_team VARCHAR(10) REFERENCES teams(id),
  away_team VARCHAR(10) REFERENCES teams(id),
  home_score INTEGER,
  away_score INTEGER,
  game_time TIMESTAMPTZ NOT NULL,
  is_complete BOOLEAN DEFAULT false,
  winner VARCHAR(10) REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_teams CHECK (home_team != away_team)
);

-- Picks table
CREATE TABLE IF NOT EXISTS picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number > 0 AND week_number <= 18),
  team_id VARCHAR(10) REFERENCES teams(id),
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, week_number)
);

-- Create indexes for better performance
CREATE INDEX idx_games_week ON games(season, week_number);
CREATE INDEX idx_games_teams ON games(home_team, away_team);
CREATE INDEX idx_picks_player ON picks(player_id, week_number);
CREATE INDEX idx_picks_pool_week ON picks(pool_id, week_number);
CREATE INDEX idx_players_pool ON players(pool_id);
CREATE INDEX idx_players_eliminated ON players(pool_id, is_eliminated);

-- Function to check if a team has already been used by a player
CREATE OR REPLACE FUNCTION check_team_not_used()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM picks 
    WHERE player_id = NEW.player_id 
    AND team_id = NEW.team_id 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Team has already been used by this player';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce team uniqueness per player
CREATE TRIGGER enforce_unique_team_picks
  BEFORE INSERT OR UPDATE ON picks
  FOR EACH ROW
  EXECUTE FUNCTION check_team_not_used();

-- Function to update player lives after game completion
CREATE OR REPLACE FUNCTION update_player_lives()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when a game is marked complete
  IF NEW.is_complete = true AND OLD.is_complete = false THEN
    -- Update picks for this game
    UPDATE picks p
    SET 
      is_correct = (p.team_id = NEW.winner),
      updated_at = NOW()
    FROM players pl
    WHERE p.player_id = pl.id
      AND p.pool_id = pl.pool_id
      AND p.week_number = NEW.week_number
      AND (p.team_id = NEW.home_team OR p.team_id = NEW.away_team);
    
    -- Reduce lives for incorrect picks
    UPDATE players pl
    SET 
      lives_remaining = GREATEST(0, pl.lives_remaining - 1),
      is_eliminated = CASE WHEN pl.lives_remaining <= 1 THEN true ELSE false END
    FROM picks p
    WHERE p.player_id = pl.id
      AND p.week_number = NEW.week_number
      AND p.is_correct = false
      AND (p.team_id = NEW.home_team OR p.team_id = NEW.away_team);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update lives when games complete
CREATE TRIGGER update_lives_on_game_complete
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_player_lives();

-- Function to get available teams for a player
CREATE OR REPLACE FUNCTION get_available_teams(player_uuid UUID)
RETURNS TABLE(team_id VARCHAR, team_name VARCHAR, team_abbreviation VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.abbreviation
  FROM teams t
  WHERE t.id NOT IN (
    SELECT p.team_id 
    FROM picks p 
    WHERE p.player_id = player_uuid
  )
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql;

-- View for current standings
CREATE OR REPLACE VIEW pool_standings AS
SELECT 
  pl.pool_id,
  pl.id as player_id,
  pl.display_name,
  pl.lives_remaining,
  pl.is_eliminated,
  COUNT(DISTINCT p.week_number) as weeks_played,
  COUNT(CASE WHEN p.is_correct = true THEN 1 END) as correct_picks,
  COUNT(CASE WHEN p.is_correct = false THEN 1 END) as incorrect_picks
FROM players pl
LEFT JOIN picks p ON pl.id = p.player_id
GROUP BY pl.pool_id, pl.id, pl.display_name, pl.lives_remaining, pl.is_eliminated
ORDER BY pl.is_eliminated ASC, pl.lives_remaining DESC, correct_picks DESC;

-- Enable Row Level Security
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policies for pools
CREATE POLICY "Public pools are viewable by everyone" ON pools
  FOR SELECT USING (true);

CREATE POLICY "Users can create pools" ON pools
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Pool admins can update their pools" ON pools
  FOR UPDATE USING (auth.uid() = admin_id);

CREATE POLICY "Pool admins can delete their pools" ON pools
  FOR DELETE USING (auth.uid() = admin_id);

-- Policies for players
CREATE POLICY "Players are viewable by pool members" ON players
  FOR SELECT USING (
    pool_id IN (
      SELECT pool_id FROM players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join pools" ON players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can update their own info" ON players
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for picks
CREATE POLICY "Picks are viewable by pool members" ON picks
  FOR SELECT USING (
    pool_id IN (
      SELECT pool_id FROM players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can make picks" ON picks
  FOR INSERT WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update their own picks before deadline" ON picks
  FOR UPDATE USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Policies for games (read-only for users)
CREATE POLICY "Games are viewable by everyone" ON games
  FOR SELECT USING (true);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Sample data for testing (optional)
-- This inserts a sample pool and some week 1 games for 2025 season
INSERT INTO pools (name, admin_id, starting_lives, current_week, is_active) 
VALUES ('2025 NFL Survivor Pool', (SELECT id FROM auth.users LIMIT 1), 3, 1, true)
ON CONFLICT DO NOTHING;

-- Sample games for Week 1 (you'll need to add real schedule data)
INSERT INTO games (season, week_number, home_team, away_team, game_time) VALUES
  (2025, 1, 'phi', 'dal', '2025-09-04T20:20:00-04:00'),
  (2025, 1, 'kc', 'det', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'buf', 'ari', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'mia', 'jax', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'no', 'car', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'nyj', 'ne', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'min', 'nyg', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'ten', 'chi', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'ind', 'hou', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'gb', 'phi', '2025-09-07T16:25:00-04:00'),
  (2025, 1, 'lv', 'lac', '2025-09-07T16:25:00-04:00'),
  (2025, 1, 'sea', 'den', '2025-09-07T16:25:00-04:00'),
  (2025, 1, 'tb', 'was', '2025-09-07T16:25:00-04:00'),
  (2025, 1, 'lar', 'cin', '2025-09-07T20:20:00-04:00'),
  (2025, 1, 'sf', 'nyj', '2025-09-08T20:15:00-04:00')
ON CONFLICT DO NOTHING;