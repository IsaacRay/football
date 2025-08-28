import { Player, Pick, Game } from '../types';

export const checkPick = (pick: Pick, game: Game): boolean => {
  if (!game.isComplete || !game.winner) return false;
  return pick.teamId === game.winner;
};

export const updatePlayerLives = (player: Player, pickCorrect: boolean): Player => {
  if (!pickCorrect && player.livesRemaining > 0) {
    const newLives = player.livesRemaining - 1;
    return {
      ...player,
      livesRemaining: newLives,
      isEliminated: newLives === 0
    };
  }
  return player;
};

export const getAvailableTeams = (player: Player, teams: string[]): string[] => {
  const usedTeams = player.picks.map(pick => pick.teamId);
  return teams.filter(team => !usedTeams.includes(team));
};

export const canMakePick = (player: Player, weekNumber: number): boolean => {
  if (player.isEliminated) return false;
  const hasPickedThisWeek = player.picks.some(pick => pick.weekNumber === weekNumber);
  return !hasPickedThisWeek;
};