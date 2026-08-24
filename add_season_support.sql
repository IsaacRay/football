-- Multi-season support.
--
-- A season is contained by its pool: pools.season says which year a pool is
-- for, players belong to a pool, and picks belong to a player. That means
-- picks and players need no changes - starting a new season is just a new
-- pool row plus its players.
--
-- Safe to run more than once.

ALTER TABLE pools ADD COLUMN IF NOT EXISTS season INTEGER;

-- Everything currently in the database belongs to the 2025 season.
UPDATE pools SET season = 2025 WHERE season IS NULL;

CREATE INDEX IF NOT EXISTS idx_pools_season ON pools(season, is_active);

-- Only one active pool per season, so getDefaultPool() can never pick wrong.
--
-- This fails if you already have two or more active pools, since the backfill
-- above puts them all in 2025. Check first:
--
--   SELECT season, count(*) FROM pools WHERE is_active GROUP BY season HAVING count(*) > 1;
--
-- If that returns anything, deactivate the pools you aren't using
-- (UPDATE pools SET is_active = false WHERE id = '...') and re-run.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pools_one_active_per_season
  ON pools(season) WHERE is_active;

-- ---------------------------------------------------------------------------
-- Starting a new season (example for 2026):
--
--   UPDATE pools SET is_active = false WHERE season = 2025;
--
--   INSERT INTO pools (name, admin_id, starting_lives, current_week, season, is_active)
--   SELECT '2026 Survivor Pool', admin_id, starting_lives, 1, 2026, true
--   FROM pools WHERE season = 2025;
--
-- Then add players to the new pool, and load the schedule with
--   POST /api/admin/sync-schedule?season=2026
-- ---------------------------------------------------------------------------
