-- Fix the Friday night KC @ LAC game time
-- Should be 8:15 PM EDT (typical Friday Night Football time)

UPDATE games 
SET game_time = '2025-09-05T20:15:00-04:00'
WHERE season = 2025 
  AND week_number = 1 
  AND away_team = 'kc' 
  AND home_team = 'lac';

-- Verification
SELECT 
  away_team || ' @ ' || home_team as matchup,
  TO_CHAR(game_time, 'Dy, Mon DD, HH12:MI AM TZ') as formatted_time
FROM games 
WHERE season = 2025 
  AND week_number = 1 
  AND away_team = 'kc' 
  AND home_team = 'lac';