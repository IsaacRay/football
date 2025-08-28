-- Bulk fix for all NFL 2025 games timezone
-- Changes all game times from EST (-05:00) to EDT (-04:00) for September-November
-- Then EST (-05:00) for December games after DST ends

-- Update September through early November games to EDT
UPDATE games 
SET game_time = game_time AT TIME ZONE 'EST' AT TIME ZONE 'EDT'
WHERE season = 2025 
  AND game_time >= '2025-09-01'::date 
  AND game_time < '2025-11-03'::date;

-- Keep December games as EST (after DST ends November 3, 2025)
-- No update needed for these as they should already be correct

-- Verification - check a few games from different months
SELECT 
  week_number,
  away_team || ' @ ' || home_team as matchup,
  TO_CHAR(game_time, 'Mon DD at HH12:MI AM TZ') as formatted_time,
  game_time
FROM games 
WHERE season = 2025 
  AND (week_number = 1 OR week_number = 8 OR week_number = 16)
ORDER BY game_time;