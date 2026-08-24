/**
 * Pool defaults.
 *
 * The authoritative value is pools.starting_lives in the database - this is the
 * fallback used when a pool row hasn't been loaded (or predates the column).
 * Keep it in step with the default in add_season_support.sql.
 */
export const DEFAULT_STARTING_LIVES = 4;
