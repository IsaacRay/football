import type { Team } from './supabaseQueries';

// A team stops being pickable the moment its own game kicks off, so a Wednesday
// opener locks those two teams while the Sunday teams stay open.
export function isTeamLocked(kickoffs: Map<string, Date>, teamId: string, now = new Date()): boolean {
  const kickoff = kickoffs.get(teamId);
  if (!kickoff) return false;
  return kickoff.getTime() <= now.getTime();
}

/**
 * The pick-eligibility rule, kept pure so it can be tested without a database.
 *
 * A team is pickable when the player hasn't already used it, it actually plays
 * this week (byes are not a legal pick), and its game hasn't kicked off.
 */
export function pickableTeams(
  allTeams: Team[],
  usedTeamIds: Set<string>,
  kickoffs: Map<string, Date>,
  now = new Date()
): Team[] {
  return allTeams.filter((team) => {
    if (usedTeamIds.has(team.id)) return false;
    if (!kickoffs.has(team.id)) return false;
    return !isTeamLocked(kickoffs, team.id, now);
  });
}
