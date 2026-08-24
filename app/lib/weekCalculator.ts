// Which NFL week the app should be showing.
//
// Week 1 runs from kickoff until the following Tuesday; every week after that
// starts Tuesday at 12:01am ET, the day after Monday Night Football.
//
// Week boundaries are computed from the season's kickoff date rather than a
// hardcoded calendar, so this works for any season without edits. See
// ./season.ts for the kickoff rule.

import { getCurrentSeason, seasonKickoff, weekStart, weeksInSeason } from './season';

export function getCurrentNFLWeek(season: number = getCurrentSeason()): number {
  const now = new Date();

  // Before the season opens, everyone is looking at week 1.
  if (now < seasonKickoff(season)) return 1;

  for (let week = weeksInSeason(season); week >= 1; week--) {
    if (now >= weekStart(season, week)) return week;
  }

  return 1;
}

export function getWeekDateRange(
  week: number,
  season: number = getCurrentSeason()
): { start: Date; end: Date } {
  const lastWeek = weeksInSeason(season);
  const clamped = Math.min(Math.max(week, 1), lastWeek);

  return {
    start: weekStart(season, clamped),
    // The final week runs a full seven days rather than into the next week.
    end:
      clamped === lastWeek
        ? new Date(weekStart(season, clamped).getTime() + 7 * 86400000)
        : weekStart(season, clamped + 1),
  };
}
