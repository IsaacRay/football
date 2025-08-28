-- Fix Week 1 game times to correct EDT
-- The KC @ LAC game should be 8:00 PM EDT, not 11:00 PM

UPDATE games 
SET game_time = '2025-09-05T20:00:00-04:00'
WHERE season = 2025 
  AND week_number = 1 
  AND away_team = 'kc' 
  AND home_team = 'lac';

-- Also fix any other incorrect Week 1 times to proper EDT
UPDATE games 
SET game_time = CASE 
  WHEN away_team = 'dal' AND home_team = 'phi' THEN '2025-09-04T20:20:00-04:00'::timestamptz
  WHEN away_team = 'kc' AND home_team = 'lac' THEN '2025-09-05T20:00:00-04:00'::timestamptz
  WHEN game_time::time = '13:00:00' THEN (DATE(game_time) || ' 13:00:00-04:00')::timestamptz
  WHEN game_time::time = '16:05:00' OR game_time::time = '19:05:00' THEN (DATE(game_time) || ' 16:05:00-04:00')::timestamptz
  WHEN game_time::time = '16:25:00' OR game_time::time = '17:25:00' OR game_time::time = '19:25:00' THEN (DATE(game_time) || ' 16:25:00-04:00')::timestamptz
  WHEN game_time::time = '20:20:00' THEN (DATE(game_time) || ' 20:20:00-04:00')::timestamptz
  WHEN game_time::time = '20:15:00' OR game_time::time = '21:15:00' THEN (DATE(game_time) || ' 20:15:00-04:00')::timestamptz
  ELSE game_time
END
WHERE season = 2025 AND week_number = 1;

-- Verification
SELECT 
  away_team || ' @ ' || home_team as matchup,
  TO_CHAR(game_time, 'Dy, Mon DD, HH12:MI AM TZ') as formatted_time,
  game_time
FROM games 
WHERE season = 2025 AND week_number = 1
ORDER BY game_time;