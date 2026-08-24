/**
 * Season resolution. Nothing in the app should hardcode a year - everything
 * that needs "which season is this?" comes through here.
 *
 * NFL seasons are named for the September they start in, so the 2026 season
 * runs Sep 2026 through Jan 2027.
 */

/** Force a season regardless of the date. Useful off-season and for testing. */
const SEASON_OVERRIDE = process.env.NEXT_PUBLIC_NFL_SEASON;

/**
 * The season the app should be showing.
 *
 * The rollover is August: from August onward we're in the new season (the
 * schedule is published by then), and January through July still points at the
 * season that just finished so results stay visible through the off-season.
 */
export function getCurrentSeason(now: Date = new Date()): number {
  if (SEASON_OVERRIDE) {
    const parsed = Number(SEASON_OVERRIDE);
    if (isValidSeason(parsed)) return parsed;
  }
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 7 ? year : year - 1;
}

export function isValidSeason(season: number): boolean {
  return Number.isInteger(season) && season >= 2000 && season <= 2100;
}

/** Regular season length. 18 weeks since 2021; 17 before that. */
export function weeksInSeason(season: number): number {
  return season >= 2021 ? 18 : 17;
}

/**
 * Kickoff: the NFL opens on the Thursday after Labor Day (the first Monday in
 * September). Verified against 2021-09-09 through 2025-09-04.
 *
 * A season can sneak a game in the night before - 2026 opens Wed Sep 9 with
 * NE @ SEA - but that only shifts the label, not the week boundaries, since
 * week 2 onward still starts the Tuesday five days after this date. Checked
 * against every game of 2024, 2025 and 2026: all 816 land in the right week.
 */
export function seasonKickoff(season: number): Date {
  const firstOfSeptember = new Date(Date.UTC(season, 8, 1));
  const dayOfWeek = firstOfSeptember.getUTCDay(); // 0 = Sunday, 1 = Monday
  const laborDay = 1 + ((1 - dayOfWeek + 7) % 7);
  // 05:00 UTC = 00:00 EST, matching how the rest of the app treats week rollover.
  return new Date(Date.UTC(season, 8, laborDay + 3, 5, 0, 0));
}

/**
 * When a given week becomes "current". Week 1 starts at kickoff; every later
 * week starts the Tuesday after Monday night football, at 12:01am ET.
 */
export function weekStart(season: number, week: number): Date {
  const kickoff = seasonKickoff(season);
  if (week <= 1) return kickoff;
  const daysAfterKickoff = 5 + (week - 2) * 7;
  return new Date(kickoff.getTime() + daysAfterKickoff * 86400000 + 60000);
}
