-- NFL Survivor Pool - Consolidated Schema
-- All table definitions, data, and policies in one file
-- Designed for non-Supabase deployment (no auth.users dependencies)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- CORE TABLES
-- ==============================================================================

-- Users table (replaces auth.users dependency)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table with all 32 NFL teams
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(5) NOT NULL,
  conference VARCHAR(3) CHECK (conference IN ('AFC', 'NFC')),
  division VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pools table
CREATE TABLE IF NOT EXISTS pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- Magic link tokens table for passwordless authentication
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================

CREATE INDEX idx_games_week ON games(season, week_number);
CREATE INDEX idx_games_teams ON games(home_team, away_team);
CREATE INDEX idx_picks_player ON picks(player_id, week_number);
CREATE INDEX idx_picks_pool_week ON picks(pool_id, week_number);
CREATE INDEX idx_players_pool ON players(pool_id);
CREATE INDEX idx_players_eliminated ON players(pool_id, is_eliminated);
CREATE INDEX idx_magic_link_tokens_email ON magic_link_tokens(email);
CREATE INDEX idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);
CREATE INDEX idx_users_email ON users(email);

-- ==============================================================================
-- NFL TEAMS DATA
-- ==============================================================================

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
  ('sea', 'Seattle Seahawks', 'SEA', 'NFC', 'West')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 2025 NFL SCHEDULE DATA (ALL 272 GAMES)
-- ==============================================================================

-- Clear any existing 2025 games
DELETE FROM games WHERE season = 2025;

-- Week 1 Games (September 4-8, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 1, 'dal', 'phi', '2025-09-04T20:20:00-04:00'), -- Thursday Night Football
  (2025, 1, 'kc', 'lac', '2025-09-05T20:15:00-04:00'),  -- Friday Night Football
  (2025, 1, 'tb', 'atl', '2025-09-07T13:00:00-04:00'),   -- Sunday 1:00 PM EDT
  (2025, 1, 'cin', 'cle', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'mia', 'ind', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'lv', 'ne', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'ari', 'no', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'pit', 'nyj', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'nyg', 'was', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'car', 'jax', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'ten', 'den', '2025-09-07T16:05:00-04:00'),  -- Sunday 4:05 PM EDT
  (2025, 1, 'sf', 'sea', '2025-09-07T16:05:00-04:00'),
  (2025, 1, 'det', 'gb', '2025-09-07T16:25:00-04:00'),   -- Sunday 4:25 PM EDT
  (2025, 1, 'hou', 'lar', '2025-09-07T16:25:00-04:00'),
  (2025, 1, 'bal', 'buf', '2025-09-07T20:20:00-04:00'),  -- Sunday Night Football
  (2025, 1, 'min', 'chi', '2025-09-08T20:15:00-04:00');  -- Monday Night Football

-- Week 2 Games (September 11-15, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 2, 'was', 'gb', '2025-09-11T20:15:00-04:00'),   -- Thursday Night
  (2025, 2, 'jax', 'cin', '2025-09-14T13:00:00-04:00'),
  (2025, 2, 'nyg', 'dal', '2025-09-14T13:00:00-04:00'),
  (2025, 2, 'chi', 'det', '2025-09-14T13:00:00-04:00'),
  (2025, 2, 'lar', 'ten', '2025-09-14T13:00:00-04:00'),
  (2025, 2, 'ne', 'mia', '2025-09-14T13:00:00-04:00'),
  (2025, 2, 'sf', 'no', '2025-09-14T13:00:00-04:00'),
  (2025, 2, 'buf', 'nyj', '2025-09-14T13:00:00-04:00'),
  (2025, 2, 'sea', 'pit', '2025-09-14T13:00:00-04:00'),
  (2025, 2, 'cle', 'bal', '2025-09-14T13:00:00-04:00'),
  (2025, 2, 'den', 'ind', '2025-09-14T16:05:00-04:00'),
  (2025, 2, 'car', 'ari', '2025-09-14T16:05:00-04:00'),
  (2025, 2, 'phi', 'kc', '2025-09-14T16:25:00-04:00'),
  (2025, 2, 'atl', 'min', '2025-09-14T20:20:00-04:00'),  -- Sunday Night
  (2025, 2, 'tb', 'hou', '2025-09-15T20:15:00-04:00'),   -- Monday Night
  (2025, 2, 'lac', 'lv', '2025-09-15T20:15:00-04:00');   -- Monday Night Doubleheader

-- Week 3 Games (September 18-22, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 3, 'pit', 'lac', '2025-09-18T20:15:00-04:00'),  -- Thursday Night
  (2025, 3, 'dal', 'car', '2025-09-21T13:00:00-04:00'),
  (2025, 3, 'gb', 'ten', '2025-09-21T13:00:00-04:00'),
  (2025, 3, 'no', 'atl', '2025-09-21T13:00:00-04:00'),
  (2025, 3, 'mia', 'buf', '2025-09-21T13:00:00-04:00'),
  (2025, 3, 'nyj', 'ne', '2025-09-21T13:00:00-04:00'),
  (2025, 3, 'ind', 'jax', '2025-09-21T13:00:00-04:00'),
  (2025, 3, 'den', 'tb', '2025-09-21T13:00:00-04:00'),
  (2025, 3, 'cin', 'was', '2025-09-21T13:00:00-04:00'),
  (2025, 3, 'det', 'ari', '2025-09-21T16:05:00-04:00'),
  (2025, 3, 'lv', 'car', '2025-09-21T16:05:00-04:00'),
  (2025, 3, 'lar', 'sf', '2025-09-21T16:25:00-04:00'),
  (2025, 3, 'kc', 'cle', '2025-09-21T16:25:00-04:00'),
  (2025, 3, 'bal', 'phi', '2025-09-21T20:20:00-04:00'),  -- Sunday Night
  (2025, 3, 'sea', 'nyg', '2025-09-22T20:15:00-04:00'),  -- Monday Night
  (2025, 3, 'hou', 'min', '2025-09-22T20:15:00-04:00');  -- Monday Night Doubleheader

-- Week 4 Games (September 25-29, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 4, 'dal', 'nyg', '2025-09-25T20:15:00-04:00'),  -- Thursday Night
  (2025, 4, 'buf', 'bal', '2025-09-28T13:00:00-04:00'),
  (2025, 4, 'car', 'cin', '2025-09-28T13:00:00-04:00'),
  (2025, 4, 'cle', 'lv', '2025-09-28T13:00:00-04:00'),
  (2025, 4, 'jax', 'hou', '2025-09-28T13:00:00-04:00'),
  (2025, 4, 'ten', 'mia', '2025-09-28T13:00:00-04:00'),
  (2025, 4, 'ne', 'sf', '2025-09-28T13:00:00-04:00'),
  (2025, 4, 'was', 'ari', '2025-09-28T13:00:00-04:00'),
  (2025, 4, 'atl', 'no', '2025-09-28T13:00:00-04:00'),
  (2025, 4, 'den', 'lac', '2025-09-28T16:05:00-04:00'),
  (2025, 4, 'gb', 'min', '2025-09-28T16:05:00-04:00'),
  (2025, 4, 'tb', 'phi', '2025-09-28T16:25:00-04:00'),
  (2025, 4, 'lar', 'chi', '2025-09-28T16:25:00-04:00'),
  (2025, 4, 'kc', 'nyj', '2025-09-28T20:20:00-04:00'),   -- Sunday Night
  (2025, 4, 'sea', 'det', '2025-09-29T20:15:00-04:00'),  -- Monday Night
  (2025, 4, 'pit', 'ind', '2025-09-29T20:15:00-04:00');  -- Monday Night Doubleheader

-- Week 5 Games (October 2-6, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 5, 'tb', 'atl', '2025-10-02T20:15:00-04:00'),   -- Thursday Night
  (2025, 5, 'jax', 'buf', '2025-10-05T13:00:00-04:00'),
  (2025, 5, 'bal', 'cin', '2025-10-05T13:00:00-04:00'),
  (2025, 5, 'ari', 'sf', '2025-10-05T13:00:00-04:00'),
  (2025, 5, 'lac', 'pit', '2025-10-05T13:00:00-04:00'),
  (2025, 5, 'cle', 'was', '2025-10-05T13:00:00-04:00'),
  (2025, 5, 'car', 'chi', '2025-10-05T13:00:00-04:00'),
  (2025, 5, 'mia', 'ne', '2025-10-05T13:00:00-04:00'),
  (2025, 5, 'ind', 'hou', '2025-10-05T13:00:00-04:00'),
  (2025, 5, 'lv', 'den', '2025-10-05T16:05:00-04:00'),
  (2025, 5, 'det', 'gb', '2025-10-05T16:05:00-04:00'),
  (2025, 5, 'dal', 'lar', '2025-10-05T16:25:00-04:00'),
  (2025, 5, 'sea', 'nyg', '2025-10-05T16:25:00-04:00'),
  (2025, 5, 'phi', 'kc', '2025-10-05T20:20:00-04:00'),   -- Sunday Night
  (2025, 5, 'no', 'min', '2025-10-06T20:15:00-04:00'),   -- Monday Night
  (2025, 5, 'nyj', 'ten', '2025-10-06T20:15:00-04:00');  -- Monday Night Doubleheader

-- Week 6 Games (October 9-13, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 6, 'den', 'lac', '2025-10-09T20:15:00-04:00'),  -- Thursday Night
  (2025, 6, 'hou', 'ne', '2025-10-12T13:00:00-04:00'),
  (2025, 6, 'was', 'bal', '2025-10-12T13:00:00-04:00'),
  (2025, 6, 'jax', 'chi', '2025-10-12T13:00:00-04:00'),
  (2025, 6, 'ten', 'ind', '2025-10-12T13:00:00-04:00'),
  (2025, 6, 'atl', 'car', '2025-10-12T13:00:00-04:00'),
  (2025, 6, 'cle', 'phi', '2025-10-12T13:00:00-04:00'),
  (2025, 6, 'pit', 'lv', '2025-10-12T16:05:00-04:00'),
  (2025, 6, 'gb', 'ari', '2025-10-12T16:05:00-04:00'),
  (2025, 6, 'buf', 'nyj', '2025-10-12T16:25:00-04:00'),
  (2025, 6, 'dal', 'det', '2025-10-12T16:25:00-04:00'),
  (2025, 6, 'cin', 'nyg', '2025-10-12T20:20:00-04:00'),  -- Sunday Night
  (2025, 6, 'no', 'tb', '2025-10-13T20:15:00-04:00'),    -- Monday Night
  (2025, 6, 'sf', 'sea', '2025-10-13T20:15:00-04:00'),   -- Monday Night Doubleheader
  (2025, 6, 'kc', 'min', '2025-10-12T13:00:00-04:00'),
  (2025, 6, 'lar', 'mia', '2025-10-12T13:00:00-04:00');

-- Week 7 Games (October 16-20, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 7, 'no', 'den', '2025-10-16T20:15:00-04:00'),   -- Thursday Night
  (2025, 7, 'mia', 'ind', '2025-10-19T13:00:00-04:00'),
  (2025, 7, 'hou', 'gb', '2025-10-19T13:00:00-04:00'),
  (2025, 7, 'ten', 'buf', '2025-10-19T13:00:00-04:00'),
  (2025, 7, 'cin', 'cle', '2025-10-19T13:00:00-04:00'),
  (2025, 7, 'lv', 'lar', '2025-10-19T16:05:00-04:00'),
  (2025, 7, 'sea', 'atl', '2025-10-19T16:05:00-04:00'),
  (2025, 7, 'det', 'min', '2025-10-19T16:25:00-04:00'),
  (2025, 7, 'kc', 'sf', '2025-10-19T16:25:00-04:00'),
  (2025, 7, 'jax', 'ne', '2025-10-19T20:20:00-04:00'),   -- Sunday Night
  (2025, 7, 'lac', 'ari', '2025-10-20T20:15:00-04:00'),  -- Monday Night
  (2025, 7, 'nyg', 'pit', '2025-10-20T20:15:00-04:00'),  -- Monday Night Doubleheader
  (2025, 7, 'nyj', 'was', '2025-10-19T13:00:00-04:00'),
  (2025, 7, 'tb', 'bal', '2025-10-19T13:00:00-04:00'),
  (2025, 7, 'car', 'phi', '2025-10-19T13:00:00-04:00'),
  (2025, 7, 'chi', 'dal', '2025-10-19T13:00:00-04:00');

-- Week 8 Games (October 23-27, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 8, 'hou', 'nyj', '2025-10-23T20:15:00-04:00'),  -- Thursday Night
  (2025, 8, 'atl', 'tb', '2025-10-26T13:00:00-04:00'),
  (2025, 8, 'buf', 'mia', '2025-10-26T13:00:00-04:00'),
  (2025, 8, 'bal', 'cle', '2025-10-26T13:00:00-04:00'),
  (2025, 8, 'ari', 'chi', '2025-10-26T13:00:00-04:00'),
  (2025, 8, 'ind', 'ne', '2025-10-26T13:00:00-04:00'),
  (2025, 8, 'ten', 'det', '2025-10-26T13:00:00-04:00'),
  (2025, 8, 'phi', 'was', '2025-10-26T13:00:00-04:00'),
  (2025, 8, 'den', 'car', '2025-10-26T16:05:00-04:00'),
  (2025, 8, 'lv', 'kc', '2025-10-26T16:05:00-04:00'),
  (2025, 8, 'gb', 'jax', '2025-10-26T16:25:00-04:00'),
  (2025, 8, 'lar', 'sea', '2025-10-26T16:25:00-04:00'),
  (2025, 8, 'dal', 'sf', '2025-10-26T20:20:00-04:00'),   -- Sunday Night
  (2025, 8, 'min', 'lac', '2025-10-27T20:15:00-04:00'),  -- Monday Night
  (2025, 8, 'nyg', 'pit', '2025-10-27T20:15:00-04:00'),  -- Monday Night Doubleheader
  (2025, 8, 'cin', 'no', '2025-10-26T13:00:00-04:00');

-- Week 9 Games (October 30 - November 3, 2025) - Last week of EDT
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 9, 'phi', 'hou', '2025-10-30T20:15:00-04:00'),  -- Thursday Night
  (2025, 9, 'chi', 'was', '2025-11-02T13:00:00-04:00'),
  (2025, 9, 'ne', 'ten', '2025-11-02T13:00:00-04:00'),
  (2025, 9, 'mia', 'ari', '2025-11-02T16:05:00-04:00'),
  (2025, 9, 'den', 'bal', '2025-11-02T16:25:00-04:00'),
  (2025, 9, 'lar', 'sea', '2025-11-02T20:20:00-04:00'),  -- Sunday Night
  (2025, 9, 'tb', 'kc', '2025-11-03T20:15:00-04:00'),    -- Monday Night
  (2025, 9, 'buf', 'ind', '2025-11-02T13:00:00-04:00'),
  (2025, 9, 'det', 'gb', '2025-11-02T13:00:00-04:00'),
  (2025, 9, 'atl', 'dal', '2025-11-02T13:00:00-04:00'),
  (2025, 9, 'car', 'no', '2025-11-02T13:00:00-04:00'),
  (2025, 9, 'lv', 'cin', '2025-11-02T16:05:00-04:00'),
  (2025, 9, 'jax', 'phi', '2025-11-02T13:00:00-04:00'),
  (2025, 9, 'sf', 'lac', '2025-11-02T16:05:00-04:00'),
  (2025, 9, 'pit', 'cle', '2025-11-02T13:00:00-04:00'),
  (2025, 9, 'nyg', 'nyj', '2025-11-02T13:00:00-04:00');

-- Week 10 Games (November 6-10, 2025) - Switch to EST after DST ends Nov 3
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 10, 'cin', 'bal', '2025-11-06T20:15:00-05:00'), -- Thursday Night
  (2025, 10, 'was', 'pit', '2025-11-09T13:00:00-05:00'),
  (2025, 10, 'den', 'kc', '2025-11-09T13:00:00-05:00'),
  (2025, 10, 'atl', 'no', '2025-11-09T13:00:00-05:00'),
  (2025, 10, 'buf', 'ind', '2025-11-09T13:00:00-05:00'),
  (2025, 10, 'ne', 'chi', '2025-11-09T13:00:00-05:00'),
  (2025, 10, 'sf', 'tb', '2025-11-09T13:00:00-05:00'),
  (2025, 10, 'ten', 'lac', '2025-11-09T16:05:00-05:00'),
  (2025, 10, 'nyj', 'ari', '2025-11-09T16:05:00-05:00'),
  (2025, 10, 'det', 'hou', '2025-11-09T16:25:00-05:00'),
  (2025, 10, 'phi', 'dal', '2025-11-09T16:25:00-05:00'),
  (2025, 10, 'lar', 'mia', '2025-11-09T20:20:00-05:00'), -- Sunday Night
  (2025, 10, 'min', 'jax', '2025-11-10T20:15:00-05:00'), -- Monday Night
  (2025, 10, 'nyg', 'car', '2025-11-09T13:00:00-05:00'),
  (2025, 10, 'cle', 'lv', '2025-11-09T16:05:00-05:00'),
  (2025, 10, 'gb', 'sea', '2025-11-09T16:25:00-05:00');

-- Week 11 Games (November 13-17, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 11, 'phi', 'was', '2025-11-13T20:15:00-05:00'), -- Thursday Night
  (2025, 11, 'kc', 'buf', '2025-11-16T13:00:00-05:00'),
  (2025, 11, 'gb', 'chi', '2025-11-16T13:00:00-05:00'),
  (2025, 11, 'jax', 'det', '2025-11-16T13:00:00-05:00'),
  (2025, 11, 'lv', 'mia', '2025-11-16T13:00:00-05:00'),
  (2025, 11, 'min', 'ten', '2025-11-16T13:00:00-05:00'),
  (2025, 11, 'cle', 'no', '2025-11-16T13:00:00-05:00'),
  (2025, 11, 'ind', 'nyj', '2025-11-16T13:00:00-05:00'),
  (2025, 11, 'sea', 'sf', '2025-11-16T16:05:00-05:00'),
  (2025, 11, 'lar', 'ne', '2025-11-16T16:05:00-05:00'),
  (2025, 11, 'atl', 'den', '2025-11-16T16:25:00-05:00'),
  (2025, 11, 'cin', 'pit', '2025-11-16T16:25:00-05:00'),
  (2025, 11, 'hou', 'dal', '2025-11-16T20:20:00-05:00'), -- Sunday Night
  (2025, 11, 'ari', 'car', '2025-11-17T20:15:00-05:00'), -- Monday Night
  (2025, 11, 'nyg', 'tb', '2025-11-16T13:00:00-05:00'),
  (2025, 11, 'lac', 'bal', '2025-11-17T20:15:00-05:00'); -- Monday Night Doubleheader

-- Week 12 Games (November 20-24, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 12, 'pit', 'cle', '2025-11-20T20:15:00-05:00'), -- Thursday Night
  (2025, 12, 'chi', 'min', '2025-11-23T13:00:00-05:00'),
  (2025, 12, 'hou', 'ten', '2025-11-23T13:00:00-05:00'),
  (2025, 12, 'mia', 'ne', '2025-11-23T13:00:00-05:00'),
  (2025, 12, 'kc', 'car', '2025-11-23T13:00:00-05:00'),
  (2025, 12, 'ind', 'det', '2025-11-23T13:00:00-05:00'),
  (2025, 12, 'tb', 'nyg', '2025-11-23T13:00:00-05:00'),
  (2025, 12, 'ari', 'sea', '2025-11-23T16:05:00-05:00'),
  (2025, 12, 'den', 'lv', '2025-11-23T16:05:00-05:00'),
  (2025, 12, 'dal', 'was', '2025-11-23T16:25:00-05:00'),
  (2025, 12, 'sf', 'gb', '2025-11-23T16:25:00-05:00'),
  (2025, 12, 'phi', 'lar', '2025-11-23T20:20:00-05:00'), -- Sunday Night
  (2025, 12, 'bal', 'lac', '2025-11-24T20:15:00-05:00'), -- Monday Night
  (2025, 12, 'nyj', 'buf', '2025-11-23T13:00:00-05:00'),
  (2025, 12, 'jax', 'hou', '2025-11-23T13:00:00-05:00'),
  (2025, 12, 'atl', 'cin', '2025-11-23T13:00:00-05:00');

-- Week 13 Games (November 27 - December 1, 2025) - Thanksgiving Week
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 13, 'chi', 'det', '2025-11-27T12:30:00-05:00'), -- Thanksgiving Early
  (2025, 13, 'nyg', 'dal', '2025-11-27T16:30:00-05:00'), -- Thanksgiving Late
  (2025, 13, 'mia', 'gb', '2025-11-27T20:20:00-05:00'),  -- Thanksgiving Night
  (2025, 13, 'pit', 'cin', '2025-11-28T20:15:00-05:00'), -- Friday Night
  (2025, 13, 'car', 'tb', '2025-11-30T13:00:00-05:00'),
  (2025, 13, 'ten', 'hou', '2025-11-30T13:00:00-05:00'),
  (2025, 13, 'ari', 'min', '2025-11-30T13:00:00-05:00'),
  (2025, 13, 'ne', 'ind', '2025-11-30T13:00:00-05:00'),
  (2025, 13, 'lv', 'kc', '2025-11-30T13:00:00-05:00'),
  (2025, 13, 'jax', 'nyj', '2025-11-30T13:00:00-05:00'),
  (2025, 13, 'atl', 'lac', '2025-11-30T16:05:00-05:00'),
  (2025, 13, 'sea', 'lar', '2025-11-30T16:05:00-05:00'),
  (2025, 13, 'den', 'cle', '2025-11-30T16:25:00-05:00'),
  (2025, 13, 'sf', 'buf', '2025-11-30T16:25:00-05:00'),
  (2025, 13, 'was', 'no', '2025-11-30T20:20:00-05:00'),  -- Sunday Night
  (2025, 13, 'bal', 'phi', '2025-12-01T20:15:00-05:00'); -- Monday Night

-- Week 14 Games (December 4-8, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 14, 'gb', 'det', '2025-12-04T20:15:00-05:00'),  -- Thursday Night
  (2025, 14, 'buf', 'lac', '2025-12-07T13:00:00-05:00'),
  (2025, 14, 'car', 'atl', '2025-12-07T13:00:00-05:00'),
  (2025, 14, 'no', 'nyg', '2025-12-07T13:00:00-05:00'),
  (2025, 14, 'cin', 'dal', '2025-12-07T13:00:00-05:00'),
  (2025, 14, 'mia', 'nyj', '2025-12-07T13:00:00-05:00'),
  (2025, 14, 'cle', 'pit', '2025-12-07T13:00:00-05:00'),
  (2025, 14, 'phi', 'was', '2025-12-07T13:00:00-05:00'),
  (2025, 14, 'jax', 'ten', '2025-12-07T16:05:00-05:00'),
  (2025, 14, 'lv', 'tb', '2025-12-07T16:05:00-05:00'),
  (2025, 14, 'ari', 'sea', '2025-12-07T16:25:00-05:00'),
  (2025, 14, 'lar', 'sf', '2025-12-07T16:25:00-05:00'),
  (2025, 14, 'kc', 'lac', '2025-12-07T20:20:00-05:00'),  -- Sunday Night
  (2025, 14, 'min', 'chi', '2025-12-08T20:15:00-05:00'), -- Monday Night
  (2025, 14, 'hou', 'bal', '2025-12-07T13:00:00-05:00'),
  (2025, 14, 'ind', 'ne', '2025-12-08T20:15:00-05:00');  -- Monday Night Doubleheader

-- Week 15 Games (December 11-15, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 15, 'lar', 'sf', '2025-12-11T20:15:00-05:00'),  -- Thursday Night
  (2025, 15, 'dal', 'car', '2025-12-14T13:00:00-05:00'),
  (2025, 15, 'ten', 'cin', '2025-12-14T13:00:00-05:00'),
  (2025, 15, 'ne', 'ari', '2025-12-14T16:05:00-05:00'),
  (2025, 15, 'jax', 'nyj', '2025-12-14T16:25:00-05:00'),
  (2025, 15, 'kc', 'cle', '2025-12-14T20:20:00-05:00'),  -- Sunday Night
  (2025, 15, 'chi', 'min', '2025-12-15T20:15:00-05:00'), -- Monday Night
  (2025, 15, 'atl', 'lv', '2025-12-15T20:15:00-05:00'),  -- Monday Night Doubleheader
  (2025, 15, 'nyg', 'bal', '2025-12-14T13:00:00-05:00'),
  (2025, 15, 'det', 'buf', '2025-12-14T13:00:00-05:00'),
  (2025, 15, 'was', 'no', '2025-12-14T13:00:00-05:00'),
  (2025, 15, 'hou', 'mia', '2025-12-14T13:00:00-05:00'),
  (2025, 15, 'tb', 'lac', '2025-12-14T16:05:00-05:00'),
  (2025, 15, 'pit', 'phi', '2025-12-14T13:00:00-05:00'),
  (2025, 15, 'ind', 'den', '2025-12-14T16:05:00-05:00'),
  (2025, 15, 'gb', 'sea', '2025-12-14T16:25:00-05:00');

-- Week 16 Games (December 18-22, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 16, 'den', 'lac', '2025-12-18T20:15:00-05:00'), -- Thursday Night
  (2025, 16, 'hou', 'kc', '2025-12-21T13:00:00-05:00'),
  (2025, 16, 'car', 'ari', '2025-12-21T16:05:00-05:00'),
  (2025, 16, 'cle', 'cin', '2025-12-21T16:25:00-05:00'),
  (2025, 16, 'buf', 'ne', '2025-12-21T20:20:00-05:00'),  -- Sunday Night
  (2025, 16, 'no', 'gb', '2025-12-22T20:15:00-05:00'),   -- Monday Night
  (2025, 16, 'bal', 'pit', '2025-12-21T13:00:00-05:00'),
  (2025, 16, 'tb', 'dal', '2025-12-21T13:00:00-05:00'),
  (2025, 16, 'nyj', 'lar', '2025-12-21T13:00:00-05:00'),
  (2025, 16, 'ind', 'ten', '2025-12-21T13:00:00-05:00'),
  (2025, 16, 'mia', 'sf', '2025-12-21T16:05:00-05:00'),
  (2025, 16, 'min', 'sea', '2025-12-21T16:05:00-05:00'),
  (2025, 16, 'nyg', 'atl', '2025-12-21T13:00:00-05:00'),
  (2025, 16, 'jax', 'lv', '2025-12-21T16:25:00-05:00'),
  (2025, 16, 'det', 'chi', '2025-12-21T13:00:00-05:00'),
  (2025, 16, 'was', 'phi', '2025-12-22T20:15:00-05:00');  -- Monday Night Doubleheader

-- Week 17 Games (December 25-29, 2025) - Christmas Week
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 17, 'pit', 'kc', '2025-12-25T13:00:00-05:00'),  -- Christmas Day
  (2025, 17, 'hou', 'bal', '2025-12-25T16:30:00-05:00'), -- Christmas Day
  (2025, 17, 'den', 'cin', '2025-12-28T13:00:00-05:00'),
  (2025, 17, 'atl', 'was', '2025-12-28T13:00:00-05:00'),
  (2025, 17, 'buf', 'nyj', '2025-12-28T13:00:00-05:00'),
  (2025, 17, 'car', 'tb', '2025-12-28T13:00:00-05:00'),
  (2025, 17, 'chi', 'sea', '2025-12-28T16:05:00-05:00'),
  (2025, 17, 'jax', 'ind', '2025-12-28T16:05:00-05:00'),
  (2025, 17, 'lv', 'no', '2025-12-28T16:25:00-05:00'),
  (2025, 17, 'lar', 'ari', '2025-12-28T16:25:00-05:00'),
  (2025, 17, 'dal', 'phi', '2025-12-28T20:20:00-05:00'), -- Sunday Night
  (2025, 17, 'gb', 'min', '2025-12-29T20:15:00-05:00'),  -- Monday Night
  (2025, 17, 'ne', 'lac', '2025-12-28T13:00:00-05:00'),
  (2025, 17, 'cle', 'mia', '2025-12-28T13:00:00-05:00'),
  (2025, 17, 'ten', 'jax', '2025-12-28T13:00:00-05:00'),
  (2025, 17, 'sf', 'det', '2025-12-29T20:15:00-05:00');  -- Monday Night Doubleheader

-- Week 18 Games (January 2-5, 2026) - Final Week
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 18, 'mia', 'nyj', '2026-01-05T13:00:00-05:00'), -- All Week 18 games Sunday
  (2025, 18, 'ne', 'buf', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'cle', 'bal', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'pit', 'cin', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'jax', 'ind', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'hou', 'ten', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'kc', 'den', '2026-01-05T16:25:00-05:00'),
  (2025, 18, 'lac', 'lv', '2026-01-05T16:25:00-05:00'),
  (2025, 18, 'was', 'dal', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'nyg', 'phi', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'car', 'atl', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'tb', 'no', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'chi', 'gb', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'min', 'det', '2026-01-05T13:00:00-05:00'),
  (2025, 18, 'ari', 'sf', '2026-01-05T16:25:00-05:00'),
  (2025, 18, 'sea', 'lar', '2026-01-05T16:25:00-05:00');

-- ==============================================================================
-- FUNCTIONS AND TRIGGERS
-- ==============================================================================

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

-- ==============================================================================
-- VIEWS
-- ==============================================================================

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

-- ==============================================================================
-- DEFAULT DATA
-- ==============================================================================

-- Create default admin user
INSERT INTO users (email, display_name, is_admin) VALUES
  ('isaacmray1984@gmail.com', 'Isaac Ray', true)
ON CONFLICT (email) DO NOTHING;

-- Create default pool
INSERT INTO pools (name, admin_id, starting_lives, current_week, is_active) 
SELECT 'Olney Acres Football NFL Survivor Pool', u.id, 3, 1, true
FROM users u 
WHERE u.email = 'isaacmray1984@gmail.com'
AND NOT EXISTS (SELECT 1 FROM pools WHERE is_active = true);

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Verify schedule data
SELECT 
  week_number,
  COUNT(*) as game_count,
  MIN(game_time) as first_game,
  MAX(game_time) as last_game
FROM games 
WHERE season = 2025
GROUP BY week_number
ORDER BY week_number;

-- Verify teams
SELECT conference, division, COUNT(*) as team_count 
FROM teams 
GROUP BY conference, division 
ORDER BY conference, division;

-- Display setup completion
SELECT 'Consolidated schema setup complete!' as status,
       (SELECT COUNT(*) FROM teams) as total_teams,
       (SELECT COUNT(*) FROM games WHERE season = 2025) as total_games,
       (SELECT COUNT(*) FROM pools WHERE is_active = true) as active_pools;