-- Convert all NFL game times to EST (Eastern Standard Time)
-- Run this in Supabase SQL Editor to update existing game times

-- Update all games to use EST timezone (-05:00)
-- This converts from various US timezones to Eastern Time

UPDATE games SET game_time = 
  CASE 
    -- Thursday Night Football (typically 8:20 PM ET)
    WHEN EXTRACT(DOW FROM game_time) = 4 AND EXTRACT(hour FROM game_time) >= 20 
    THEN (DATE(game_time) || ' 20:20:00-05:00')::timestamptz
    
    -- Friday games (8:15 PM ET) 
    WHEN EXTRACT(DOW FROM game_time) = 5 AND EXTRACT(hour FROM game_time) >= 20
    THEN (DATE(game_time) || ' 20:15:00-05:00')::timestamptz
    
    -- Sunday 1 PM ET games
    WHEN EXTRACT(DOW FROM game_time) = 0 AND EXTRACT(hour FROM game_time) BETWEEN 12 AND 14
    THEN (DATE(game_time) || ' 13:00:00-05:00')::timestamptz
    
    -- Sunday 4:05 PM ET games (West Coast afternoon)
    WHEN EXTRACT(DOW FROM game_time) = 0 AND EXTRACT(hour FROM game_time) BETWEEN 16 AND 17 AND EXTRACT(minute FROM game_time) = 5
    THEN (DATE(game_time) || ' 16:05:00-05:00')::timestamptz
    
    -- Sunday 4:25 PM ET games
    WHEN EXTRACT(DOW FROM game_time) = 0 AND EXTRACT(hour FROM game_time) BETWEEN 16 AND 17 AND EXTRACT(minute FROM game_time) = 25
    THEN (DATE(game_time) || ' 16:25:00-05:00')::timestamptz
    
    -- Sunday Night Football (8:20 PM ET)
    WHEN EXTRACT(DOW FROM game_time) = 0 AND EXTRACT(hour FROM game_time) >= 20
    THEN (DATE(game_time) || ' 20:20:00-05:00')::timestamptz
    
    -- Monday Night Football (8:15 PM ET)
    WHEN EXTRACT(DOW FROM game_time) = 1 AND EXTRACT(hour FROM game_time) >= 20
    THEN (DATE(game_time) || ' 20:15:00-05:00')::timestamptz
    
    -- Thanksgiving games
    WHEN DATE(game_time) = '2025-11-27' AND EXTRACT(hour FROM game_time) BETWEEN 12 AND 13
    THEN (DATE(game_time) || ' 12:30:00-05:00')::timestamptz -- Early game
    WHEN DATE(game_time) = '2025-11-27' AND EXTRACT(hour FROM game_time) BETWEEN 16 AND 17  
    THEN (DATE(game_time) || ' 16:30:00-05:00')::timestamptz -- Late game
    WHEN DATE(game_time) = '2025-11-27' AND EXTRACT(hour FROM game_time) >= 20
    THEN (DATE(game_time) || ' 20:20:00-05:00')::timestamptz -- Night game
    
    -- Christmas games
    WHEN DATE(game_time) = '2025-12-25' AND EXTRACT(hour FROM game_time) BETWEEN 12 AND 14
    THEN (DATE(game_time) || ' 13:00:00-05:00')::timestamptz
    WHEN DATE(game_time) = '2025-12-25' AND EXTRACT(hour FROM game_time) BETWEEN 16 AND 17
    THEN (DATE(game_time) || ' 16:30:00-05:00')::timestamptz
    WHEN DATE(game_time) = '2025-12-25' AND EXTRACT(hour FROM game_time) >= 20
    THEN (DATE(game_time) || ' 20:15:00-05:00')::timestamptz
    
    -- Default: convert to EST by adjusting timezone
    ELSE game_time AT TIME ZONE 'UTC' AT TIME ZONE 'EST'
  END
WHERE season = 2025;

-- Verify the conversion
SELECT 
  week_number,
  away_team,
  home_team,
  game_time,
  EXTRACT(DOW FROM game_time) as day_of_week,
  TO_CHAR(game_time, 'Dy HH24:MI TZ') as formatted_time
FROM games 
WHERE season = 2025 
ORDER BY week_number, game_time
LIMIT 20;