-- Link players to logins by email.
--
-- Before this, /api/player/me matched players.display_name against the part of
-- the login email before the "@". That made display names load-bearing (setting
-- one broke the link), was case-sensitive, and collided whenever two people
-- shared a local part (john@gmail.com vs john@work.com).
--
-- Safe to run more than once.

ALTER TABLE players ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_players_email ON players(pool_id, email);

-- Existing rows have no email - only the local part survives in display_name,
-- and the domain can't be recovered - so they keep working through the old
-- prefix rule until you fill an address in from User Management.
--
-- To see who still needs one:
--   SELECT display_name FROM players WHERE email IS NULL;
