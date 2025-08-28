-- Fix NFL 2025 Schedule - Convert all times to EST properly
-- This corrects the timezone issues without changing dates

-- Clear existing games and insert correct schedule
DELETE FROM games WHERE season = 2025;

-- Week 1 Games (September 4-8, 2025) - All times converted to EST
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  -- Thursday Night Football
  (2025, 1, 'dal', 'phi', '2025-09-04T20:20:00-05:00'), -- 8:20 PM EST
  
  -- Friday Night (was 8:00 PM PT = 11:00 PM EST)
  (2025, 1, 'kc', 'lac', '2025-09-05T23:00:00-05:00'), -- 11:00 PM EST
  
  -- Sunday 1:00 PM EST games
  (2025, 1, 'tb', 'atl', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'cin', 'cle', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'mia', 'ind', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'lv', 'ne', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'ari', 'no', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'pit', 'nyj', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'nyg', 'was', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'car', 'jax', '2025-09-07T13:00:00-05:00'),
  
  -- Sunday 4:05 PM EST games (was 1:05 PM PT)
  (2025, 1, 'ten', 'den', '2025-09-07T16:05:00-05:00'),
  (2025, 1, 'sf', 'sea', '2025-09-07T16:05:00-05:00'),
  
  -- Sunday 4:25 PM EST games
  (2025, 1, 'det', 'gb', '2025-09-07T16:25:00-05:00'),
  (2025, 1, 'hou', 'lar', '2025-09-07T16:25:00-05:00'),
  
  -- Sunday Night Football 8:20 PM EST
  (2025, 1, 'bal', 'buf', '2025-09-07T20:20:00-05:00'),
  
  -- Monday Night Football 8:15 PM EST (NOT Tuesday!)
  (2025, 1, 'min', 'chi', '2025-09-08T20:15:00-05:00');

-- Week 2 Games (September 11-15, 2025)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 2, 'was', 'gb', '2025-09-11T20:15:00-05:00'), -- Thursday Night
  (2025, 2, 'jax', 'cin', '2025-09-14T13:00:00-05:00'),
  (2025, 2, 'nyg', 'dal', '2025-09-14T13:00:00-05:00'),
  (2025, 2, 'chi', 'det', '2025-09-14T13:00:00-05:00'),
  (2025, 2, 'lar', 'ten', '2025-09-14T13:00:00-05:00'),
  (2025, 2, 'ne', 'mia', '2025-09-14T13:00:00-05:00'),
  (2025, 2, 'sf', 'no', '2025-09-14T13:00:00-05:00'),
  (2025, 2, 'buf', 'nyj', '2025-09-14T13:00:00-05:00'),
  (2025, 2, 'sea', 'pit', '2025-09-14T13:00:00-05:00'),
  (2025, 2, 'cle', 'bal', '2025-09-14T13:00:00-05:00'),
  (2025, 2, 'den', 'ind', '2025-09-14T16:05:00-05:00'),
  (2025, 2, 'car', 'ari', '2025-09-14T16:05:00-05:00'),
  (2025, 2, 'phi', 'kc', '2025-09-14T16:25:00-05:00'),
  (2025, 2, 'atl', 'min', '2025-09-14T20:20:00-05:00'), -- Sunday Night
  (2025, 2, 'tb', 'hou', '2025-09-15T20:15:00-05:00'), -- Monday Night
  (2025, 2, 'lac', 'lv', '2025-09-15T20:15:00-05:00'); -- Monday Night doubleheader

-- Quick verification - let's see the times are correct now
SELECT 
  week_number,
  away_team || ' @ ' || home_team as matchup,
  game_time,
  TO_CHAR(game_time, 'Dy Mon DD, YYYY at HH12:MI AM TZ') as formatted_time
FROM games 
WHERE season = 2025 AND week_number <= 2
ORDER BY game_time;