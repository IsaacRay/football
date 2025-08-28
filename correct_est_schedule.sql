-- NFL 2025 Schedule - Times already properly converted to EST
-- West Coast games that start at 5pm local = 8pm EST, etc.

-- Clear any incorrect times and use the original correct schedule
DELETE FROM games WHERE season = 2025;

-- Week 1 Games (September 4-8, 2025) - All times already in EST
INSERT INTO games (season, week_number, away_team, home_team, game_time) VALUES
  (2025, 1, 'dal', 'phi', '2025-09-04T20:20:00-05:00'), -- Thursday 8:20 PM EST
  (2025, 1, 'kc', 'lac', '2025-09-05T20:00:00-05:00'),  -- Friday 8:00 PM EST (5pm PT)
  (2025, 1, 'tb', 'atl', '2025-09-07T13:00:00-05:00'),   -- Sunday 1:00 PM EST
  (2025, 1, 'cin', 'cle', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'mia', 'ind', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'lv', 'ne', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'ari', 'no', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'pit', 'nyj', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'nyg', 'was', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'car', 'jax', '2025-09-07T13:00:00-05:00'),
  (2025, 1, 'ten', 'den', '2025-09-07T16:05:00-05:00'),  -- Sunday 4:05 PM EST (1:05 PT)
  (2025, 1, 'sf', 'sea', '2025-09-07T16:05:00-05:00'),   -- Sunday 4:05 PM EST (1:05 PT)
  (2025, 1, 'det', 'gb', '2025-09-07T16:25:00-05:00'),   -- Sunday 4:25 PM EST
  (2025, 1, 'hou', 'lar', '2025-09-07T16:25:00-05:00'),  -- Sunday 4:25 PM EST (1:25 PT)
  (2025, 1, 'bal', 'buf', '2025-09-07T20:20:00-05:00'),  -- Sunday Night 8:20 PM EST
  (2025, 1, 'min', 'chi', '2025-09-08T20:15:00-05:00');  -- Monday Night 8:15 PM EST

-- Verify the times look correct
SELECT 
  week_number,
  away_team || ' @ ' || home_team as matchup,
  TO_CHAR(game_time, 'Dy Mon DD at HH12:MI AM') as game_day_time,
  game_time
FROM games 
WHERE season = 2025 AND week_number = 1
ORDER BY game_time;