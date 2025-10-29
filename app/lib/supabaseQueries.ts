import { createClient } from '../utils/supabase/client';
import { Database } from './supabase';

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
export async function getGamesByWeek(week: number, season = 2025): Promise<Game[]> {
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

export async function submitPick(pick: Omit<Pick, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
  const { error } = await supabase
    .from('picks')
    .insert(pick);
  
  if (error) {
    return false;
  }
  
  return true;
}

// Update existing pick
export async function updatePick(playerId: string, weekNumber: number, teamId: string): Promise<boolean> {
  const { error } = await supabase
    .from('picks')
    .update({ 
      team_id: teamId,
      updated_at: new Date().toISOString()
    })
    .eq('player_id', playerId)
    .eq('week_number', weekNumber);
  
  if (error) {
    return false;
  }
  
  return true;
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

// Check if picks can still be edited (before first game of week starts)
export async function canEditPicks(weekNumber: number, season = 2025): Promise<boolean> {
  const { data, error } = await supabase
    .from('games')
    .select('game_time')
    .eq('season', season)
    .eq('week_number', weekNumber)
    .order('game_time')
    .limit(1)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  const firstGameTime = new Date(data.game_time);
  const now = new Date();
  
  return now < firstGameTime;
}

// Pools
export async function getDefaultPool(): Promise<Pool | null> {
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
export async function getAvailableTeams(playerId: string, excludeWeek?: number): Promise<Team[]> {
  // Get all teams
  const allTeams = await getAllTeams();
  
  // Get player's picks
  const picks = await getPicksByPlayer(playerId);
  
  // Filter picks to exclude the specified week (for editing)
  const filteredPicks = excludeWeek 
    ? picks.filter(pick => pick.week_number !== excludeWeek)
    : picks;
  
  const usedTeamIds = filteredPicks.map(pick => pick.team_id);
  
  // Filter out used teams
  return allTeams.filter(team => !usedTeamIds.includes(team.id));
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
export async function getCurrentNFLWeek(): Promise<number> {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Get games for current season to determine current week
  const { data, error } = await supabase
    .from('games')
    .select('week_number, game_time')
    .eq('season', currentYear)
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