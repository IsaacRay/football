import { cookies } from 'next/headers';
import { createClient } from '../utils/supabase/server';
import type { Player } from './supabaseQueries';

export async function getBackdoorPlayer(poolId: string): Promise<Player | null> {
  const cookieStore = await cookies();
  const backdoorPlayerName = cookieStore.get('backdoor_player')?.value;
  
  if (!backdoorPlayerName) {
    return null;
  }
  
  const supabase = await createClient();
  
  // Find player by display name
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('pool_id', poolId)
    .eq('display_name', backdoorPlayerName)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}

export async function getCurrentPlayerWithBackdoor(poolId: string): Promise<Player | null> {
  // First check for backdoor player
  const backdoorPlayer = await getBackdoorPlayer(poolId);
  if (backdoorPlayer) {
    return backdoorPlayer;
  }
  
  // Otherwise get the regular authenticated user's player
  const supabase = await createClient();
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