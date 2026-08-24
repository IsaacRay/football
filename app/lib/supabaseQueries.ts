import { createClient } from '../utils/supabase/client';
import { Database } from './supabase';
import { getCurrentSeason } from './season';
import { DEFAULT_STARTING_LIVES } from './poolConfig';

export type Team = Database['public']['Tables']['teams']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type Pick = Database['public']['Tables']['picks']['Row'];
export type Pool = Database['public']['Tables']['pools']['Row'];

const supabase = createClient();

// Teams
export async function getAllTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');
  
  if (error) {
    return [];
  }
  
  return data || [];
}

// Games
export async function getGamesByWeek(week: number, season = getCurrentSeason()): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('season', season)
    .eq('week_number', week)
    .order('game_time');
  
  if (error) {
    return [];
  }
  
  return data || [];
}

// Update game winner (Admin function)
export async function updateGameWinner(gameId: string, winnerId: string | null): Promise<boolean> {
  const { data, error } = await supabase
    .from('games')
    .update({ 
      winner: winnerId,
      is_complete: winnerId !== null,
      updated_at: new Date().toISOString()
    })
    .eq('id', gameId)
    .select();
  
  if (error) {
    return false;
  }
  
  return true;
}

// Players
export async function getPlayersByPool(poolId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('pool_id', poolId)
    .order('lives_remaining', { ascending: false })
    .order('display_name');
  
  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }
  
  return data || [];
}

// Get players with their pick counts for leaderboard
export async function getPlayersWithPickCounts(poolId: string): Promise<(Player & { pick_count: number })[]> {
  // First get all players
  const players = await getPlayersByPool(poolId);
  
  // Then get pick counts for each player
  const playersWithCounts = await Promise.all(
    players.map(async (player) => {
      const { count, error } = await supabase
        .from('picks')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', player.id);
      
      return {
        ...player,
        pick_count: error ? 0 : (count || 0)
      };
    })
  );
  
  return playersWithCounts;
}

// Note: getCurrentUserPlayer has been replaced with /api/player/me endpoint

// Picks
export async function getPicksByPlayer(playerId: string): Promise<Pick[]> {
  const { data, error } = await supabase
    .from('picks')
    .select('*')
    .eq('player_id', playerId)
    .order('week_number');
  
  if (error) {
    console.error('Error fetching picks:', error);
    return [];
  }
  
  return data || [];
}

export interface PickResult {
  ok: boolean;
  message?: string;
}

/**
 * Re-checks kickoff before writing. A page left open across kickoff would
 * otherwise submit a pick for a game already in progress.
 */
async function checkTeamStillPickable(
  weekNumber: number,
  teamId: string,
  season = getCurrentSeason()
): Promise<string | null> {
  const kickoffs = await getWeekKickoffs(weekNumber, season);

  if (!kickoffs.has(teamId)) {
    return `${teamId.toUpperCase()} has no game in week ${weekNumber}.`;
  }
  if (isTeamLocked(kickoffs, teamId)) {
    return `${teamId.toUpperCase()} is locked - their game has already started.`;
  }
  return null;
}

export async function submitPick(
  pick: Omit<Pick, 'id' | 'created_at' | 'updated_at'>
): Promise<PickResult> {
  const blocked = await checkTeamStillPickable(pick.week_number, pick.team_id);
  if (blocked) return { ok: false, message: blocked };

  const { error } = await supabase.from('picks').insert(pick);

  if (error) {
    console.error('Error submitting pick:', error);
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

// Update existing pick
export async function updatePick(
  playerId: string,
  weekNumber: number,
  teamId: string
): Promise<PickResult> {
  // Both the team being switched to and the one being switched away from must
  // still be open - once your team is playing, the pick is final.
  const blocked = await checkTeamStillPickable(weekNumber, teamId);
  if (blocked) return { ok: false, message: blocked };

  if (await isPickLocked(playerId, weekNumber)) {
    return { ok: false, message: 'Your current pick is locked - that game has already started.' };
  }

  const { error } = await supabase
    .from('picks')
    .update({ team_id: teamId, updated_at: new Date().toISOString() })
    .eq('player_id', playerId)
    .eq('week_number', weekNumber);

  if (error) {
    console.error('Error updating pick:', error);
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

// Get existing pick for a player and week
export async function getExistingPick(playerId: string, weekNumber: number): Promise<Pick | null> {
  const { data, error } = await supabase
    .from('picks')
    .select('*')
    .eq('player_id', playerId)
    .eq('week_number', weekNumber)
    .single();
  
  if (error) {
    return null;
  }
  
  return data;
}

// Kickoff time for every team playing in a given week, keyed by team id.
// Teams on a bye simply aren't in the map.
export async function getWeekKickoffs(
  weekNumber: number,
  season = getCurrentSeason()
): Promise<Map<string, Date>> {
  const { data, error } = await supabase
    .from('games')
    .select('home_team, away_team, game_time')
    .eq('season', season)
    .eq('week_number', weekNumber);

  const kickoffs = new Map<string, Date>();
  if (error || !data) {
    console.error('Error fetching kickoff times:', error);
    return kickoffs;
  }

  for (const game of data) {
    const kickoff = new Date(game.game_time);
    kickoffs.set(game.home_team, kickoff);
    kickoffs.set(game.away_team, kickoff);
  }
  return kickoffs;
}

export { isTeamLocked, pickableTeams } from './pickRules';
import { isTeamLocked, pickableTeams } from './pickRules';

// Whether a player's existing pick is now locked in - i.e. that team has played
// or is playing. Other teams may still be open for the same week.
export async function isPickLocked(
  playerId: string,
  weekNumber: number,
  season = getCurrentSeason()
): Promise<boolean> {
  const pick = await getExistingPick(playerId, weekNumber);
  if (!pick) return false;

  const kickoffs = await getWeekKickoffs(weekNumber, season);
  return isTeamLocked(kickoffs, pick.team_id);
}

// Pools
export async function getDefaultPool(season = getCurrentSeason()): Promise<Pool | null> {
  // Each season gets its own pool row, so scope to the one being played.
  const scoped = await supabase
    .from('pools')
    .select('*')
    .eq('season', season)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!scoped.error && scoped.data) return scoped.data;

  // Falls through when pools.season hasn't been added yet (add_season_support.sql)
  // or when this season has no pool of its own.
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching default pool:', error);
    throw new Error(`Failed to fetch default pool: ${error.message}`);
  }

  return data;
}

// Note: createPlayerForCurrentUser has been removed - players are now created by admin via the admin panel

// Available teams for a player (teams not yet used)
export async function getAvailableTeams(
  playerId: string,
  weekNumber?: number,
  season = getCurrentSeason()
): Promise<Team[]> {
  const allTeams = await getAllTeams();
  const picks = await getPicksByPlayer(playerId);

  // The pick for the week being edited doesn't count against the player.
  const usedTeamIds = new Set(
    picks
      .filter((pick) => pick.week_number !== weekNumber)
      .map((pick) => pick.team_id)
  );

  // Without a week there is nothing to lock against - the admin pick tool uses
  // this form deliberately so it can still set a pick after kickoff.
  if (weekNumber === undefined) {
    return allTeams.filter((team) => !usedTeamIds.has(team.id));
  }

  const kickoffs = await getWeekKickoffs(weekNumber, season);
  return pickableTeams(allTeams, usedTeamIds, kickoffs);
}

// Get all picks for all players in a pool
export async function getAllPicksForPool(poolId: string): Promise<(Pick & { player: Player })[]> {
  const { data, error } = await supabase
    .from('picks')
    .select(`
      *,
      player:players!inner(*)
    `)
    .eq('player.pool_id', poolId)
    .order('week_number')
    .order('player.display_name');
  
  if (error) {
    console.error('Error fetching all picks:', error);
    return [];
  }
  
  return data || [];
}

// Get player with their picks and available teams
export async function getPlayerWithPicksAndTeams(poolId: string): Promise<{
  player: Player;
  picks: Pick[];
  usedTeamIds: string[];
  availableTeamIds: string[];
}[]> {
  const players = await getPlayersByPool(poolId);
  const allTeams = await getAllTeams();
  
  const playersWithData = await Promise.all(
    players.map(async (player) => {
      const picks = await getPicksByPlayer(player.id);
      const usedTeamIds = picks.map(pick => pick.team_id);
      const availableTeamIds = allTeams
        .filter(team => !usedTeamIds.includes(team.id))
        .map(team => team.id);
      
      return {
        player,
        picks,
        usedTeamIds,
        availableTeamIds
      };
    })
  );
  
  return playersWithData;
}

// Get current NFL week
export async function getCurrentNFLWeek(season = getCurrentSeason()): Promise<number> {
  const now = new Date();

  // Get games for the season to determine current week
  const { data, error } = await supabase
    .from('games')
    .select('week_number, game_time')
    .eq('season', season)
    .order('week_number')
    .order('game_time');
  
  if (error || !data || data.length === 0) {
    return 1; // Default to week 1 if no games found
  }
  
  // Find the current week based on game times
  for (const game of data) {
    const gameTime = new Date(game.game_time);
    if (gameTime > now) {
      return game.week_number;
    }
  }
  
  // If all games have passed, return the last week
  const lastGame = data[data.length - 1];
  return lastGame.week_number;
}

// Create a new user with email (Admin function)
export async function createUserWithEmail(email: string, displayName?: string): Promise<{ success: boolean; message: string; userId?: string }> {
  try {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
    });
    
    if (authError) {
      return { success: false, message: authError.message };
    }
    
    if (!authData.user) {
      return { success: false, message: 'Failed to create user' };
    }
    
    return { success: true, message: 'User created successfully', userId: authData.user.id };
  } catch (error) {
    return { success: false, message: 'An error occurred while creating user' };
  }
}