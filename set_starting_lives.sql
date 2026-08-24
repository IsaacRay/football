-- Starting lives: 3 -> 4.
--
-- pools.starting_lives is the authority; players.lives_remaining is derived
-- from it. Safe to run more than once.

ALTER TABLE pools   ALTER COLUMN starting_lives  SET DEFAULT 4;
ALTER TABLE players ALTER COLUMN lives_remaining SET DEFAULT 4;

UPDATE pools SET starting_lives = 4 WHERE is_active;

-- Existing players still hold totals computed against 3 lives. Re-derive them:
--
--   curl -X POST "https://<your-host>/api/admin/score-week"
--
-- which recomputes lives_remaining as starting_lives minus counted losses. Do
-- NOT just add 1 to everyone - a player who already lost four games would come
-- out at 1 life instead of eliminated.
--
-- If the season hasn't kicked off yet there is nothing to derive, so this is
-- equivalent and needs no API call:
--
--   UPDATE players SET lives_remaining = 4, is_eliminated = false
--   WHERE pool_id IN (SELECT id FROM pools WHERE is_active);
