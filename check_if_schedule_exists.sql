-- Check if NFL schedule data exists
-- Run this in Supabase SQL Editor to see if you have the schedule

-- Check if teams table exists and has data
SELECT 'Teams table:' as info, count(*) as count FROM teams;

-- Check if games table exists and has data
SELECT 'Games table:' as info, count(*) as count FROM games WHERE season = 2025;

-- Check games by week
SELECT 'Games by week:' as info, week_number, count(*) as games 
FROM games 
WHERE season = 2025 
GROUP BY week_number 
ORDER BY week_number 
LIMIT 5;

-- Check current date vs NFL season start
SELECT 
  'Current date:' as info,
  CURRENT_DATE as current_date,
  '2025-09-04'::date as nfl_start,
  CASE 
    WHEN CURRENT_DATE < '2025-09-04'::date THEN 'Pre-season'
    WHEN CURRENT_DATE >= '2025-09-04'::date AND CURRENT_DATE < '2026-01-05'::date THEN 'Regular season'
    ELSE 'Post-season'
  END as season_status;