-- NFL 2025 Season Schedule for Supabase
-- Insert this after creating the main schema

-- Clear any existing 2025 games
DELETE FROM games WHERE season = 2025;

-- Week 1 Games (September 4-8, 2025)
INSERT INTO games (season, week_number, home_team, away_team, game_time) VALUES
  -- Thursday, September 4
  (2025, 1, 'phi', 'dal', '2025-09-04T20:20:00-04:00'), -- NFL Kickoff Game
  
  -- Friday, September 5  
  (2025, 1, 'lac', 'kc', '2025-09-05T20:15:00-04:00'), -- Brazil game
  
  -- Sunday, September 7 (1:00 PM ET games)
  (2025, 1, 'atl', 'tb', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'cle', 'cin', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'ind', 'mia', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'nyj', 'ne', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'no', 'car', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'pit', 'hou', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'ten', 'jax', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'buf', 'bal', '2025-09-07T13:00:00-04:00'),
  
  -- Sunday, September 7 (4:05/4:25 PM ET games)
  (2025, 1, 'ari', 'was', '2025-09-07T16:05:00-04:00'),
  (2025, 1, 'den', 'sea', '2025-09-07T16:05:00-04:00'),
  (2025, 1, 'lv', 'lac', '2025-09-07T16:25:00-04:00'),
  (2025, 1, 'sf', 'det', '2025-09-07T16:25:00-04:00'),
  
  -- Sunday Night Football
  (2025, 1, 'gb', 'lar', '2025-09-07T20:20:00-04:00'),
  
  -- Monday Night Football, September 8
  (2025, 1, 'chi', 'min', '2025-09-08T20:15:00-04:00'),
  (2025, 1, 'nyg', 'min', '2025-09-08T20:15:00-04:00'); -- Second MNF game

-- Week 2 Games (September 11-15, 2025) 
-- Add more weeks as needed...

-- Sample Week 2 Thursday Night game
INSERT INTO games (season, week_number, home_team, away_team, game_time) VALUES
  (2025, 2, 'buf', 'mia', '2025-09-11T20:15:00-04:00'); -- Thursday Night Football

-- Week 3 Games (September 18-22, 2025)
-- Add games here...

-- Week 4 Games (September 25-29, 2025)
-- Add games here...

-- Week 5 Games (October 2-6, 2025) - First bye week starts
-- Add games here...

-- Week 6 Games (October 9-13, 2025)
-- Add games here...

-- Week 7 Games (October 16-20, 2025)
-- Add games here...

-- Week 8 Games (October 23-27, 2025)
-- Add games here...

-- Week 9 Games (October 30 - November 3, 2025)
-- Add games here...

-- Week 10 Games (November 6-10, 2025)
-- Add games here...

-- Week 11 Games (November 13-17, 2025)
-- Add games here...

-- Week 12 Games (November 20-24, 2025)
-- Add games here...

-- Week 13 Games (November 27 - December 1, 2025) - Thanksgiving week
INSERT INTO games (season, week_number, home_team, away_team, game_time) VALUES
  (2025, 13, 'det', 'chi', '2025-11-27T12:30:00-05:00'), -- Thanksgiving early game
  (2025, 13, 'dal', 'nyg', '2025-11-27T16:30:00-05:00'), -- Thanksgiving late game
  (2025, 13, 'gb', 'mia', '2025-11-27T20:20:00-05:00'); -- Thanksgiving night game

-- Week 14 Games (December 4-8, 2025) - Last bye week
-- Add games here...

-- Week 15 Games (December 11-15, 2025)
-- Add games here...

-- Week 16 Games (December 18-22, 2025)
-- Add games here...

-- Week 17 Games (December 25-29, 2025) - Christmas week
INSERT INTO games (season, week_number, home_team, away_team, game_time) VALUES
  (2025, 17, 'kc', 'pit', '2025-12-25T13:00:00-05:00'), -- Christmas Day
  (2025, 17, 'bal', 'hou', '2025-12-25T16:30:00-05:00'); -- Christmas Day

-- Week 18 Games (January 3-4, 2026) - All divisional games
-- Add games here...

-- Helper function to import bulk schedule data
-- You can use this function to easily add games in bulk
CREATE OR REPLACE FUNCTION add_game(
  p_season INTEGER,
  p_week INTEGER,
  p_away VARCHAR(10),
  p_home VARCHAR(10),
  p_game_date DATE,
  p_game_time TIME
) RETURNS void AS $$
BEGIN
  INSERT INTO games (season, week_number, away_team, home_team, game_time)
  VALUES (p_season, p_week, p_away, p_home, (p_game_date::text || ' ' || p_game_time::text)::timestamptz)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT add_game(2025, 2, 'dal', 'nyg', '2025-09-14', '13:00:00');

-- View to see upcoming games for the current week
CREATE OR REPLACE VIEW current_week_games AS
SELECT 
  g.week_number,
  g.game_time,
  ht.name as home_team_name,
  ht.abbreviation as home_team_abbr,
  at.name as away_team_name,
  at.abbreviation as away_team_abbr,
  g.home_score,
  g.away_score,
  g.is_complete,
  wt.name as winner_name
FROM games g
JOIN teams ht ON g.home_team = ht.id
JOIN teams at ON g.away_team = at.id
LEFT JOIN teams wt ON g.winner = wt.id
WHERE g.season = 2025
  AND g.week_number = (
    SELECT MIN(week_number) 
    FROM games 
    WHERE season = 2025 
      AND is_complete = false
  )
ORDER BY g.game_time;