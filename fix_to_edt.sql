-- Fix NFL 2025 Schedule to use EDT (Eastern Daylight Time)
-- Football season runs during daylight time (-04:00), not standard time (-05:00)

-- Clear existing games and insert with correct EDT timezone
DELETE FROM games WHERE season = 2025;

-- Week 1 Games (September 4-8, 2025) - All times in EDT (-04:00)
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 1, 'dal', 'phi', '2025-09-04T20:20:00-04:00'), -- Thursday 8:20 PM EDT
  (2025, 1, 'kc', 'lac', '2025-09-05T20:00:00-04:00'),  -- Friday 8:00 PM EDT
  (2025, 1, 'tb', 'atl', '2025-09-07T13:00:00-04:00'),   -- Sunday 1:00 PM EDT
  (2025, 1, 'cin', 'cle', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'mia', 'ind', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'lv', 'ne', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'ari', 'no', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'pit', 'nyj', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'nyg', 'was', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'car', 'jax', '2025-09-07T13:00:00-04:00'),
  (2025, 1, 'ten', 'den', '2025-09-07T16:05:00-04:00'),  -- Sunday 4:05 PM EDT
  (2025, 1, 'sf', 'sea', '2025-09-07T16:05:00-04:00'),   -- Sunday 4:05 PM EDT
  (2025, 1, 'det', 'gb', '2025-09-07T16:25:00-04:00'),   -- Sunday 4:25 PM EDT
  (2025, 1, 'hou', 'lar', '2025-09-07T16:25:00-04:00'),  -- Sunday 4:25 PM EDT
  (2025, 1, 'bal', 'buf', '2025-09-07T20:20:00-04:00'),  -- Sunday Night 8:20 PM EDT
  (2025, 1, 'min', 'chi', '2025-09-08T20:15:00-04:00');  -- Monday Night 8:15 PM EDT

-- Update week calculator dates to use EDT as well
-- Note: DST ends on November 3, 2025, so late season games will be EST
-- But most of the season is EDT

-- Verify the times now show 1:00 PM, 4:05 PM, etc.
SELECT 
  week_number,
  away_team || ' @ ' || home_team as matchup,
  TO_CHAR(game_time, 'Dy Mon DD at HH12:MI AM TZ') as game_time_formatted,
  game_time
FROM games 
WHERE season = 2025 AND week_number = 1
ORDER BY game_time;