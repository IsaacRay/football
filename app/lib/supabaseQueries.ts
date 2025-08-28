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
  const { error } = await supabase
    .from('games')
    .update({ 
      winner: winnerId,
      is_complete: winnerId !== null,
      updated_at: new Date().toISOString()
    })
    .eq('id', gameId);
  
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
    return [];
  }
  
  return data || [];
}

export async function getCurrentUserPlayer(poolId: string): Promise<Player | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', user.id)
    .single();
  
  if (error) {
    return null;
  }
  
  return data;
}

// Picks
export async function getPicksByPlayer(playerId: string): Promise<Pick[]> {
  const { data, error } = await supabase
    .from('picks')
    .select('*')
    .eq('player_id', playerId)
    .order('week_number');
  
  if (error) {
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

export async function createPlayerForCurrentUser(poolId: string, displayName?: string): Promise<Player | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('players')
    .insert({
      pool_id: poolId,
      user_id: user.id,
      display_name: displayName || user.email?.split('@')[0] || 'Player',
      lives_remaining: 3,
      is_eliminated: false,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating player:', error);
    throw new Error(`Failed to create player: ${error.message}`);
  }
  
  return data;
}

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