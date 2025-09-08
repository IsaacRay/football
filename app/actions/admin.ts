'use server';

import { createClient } from '../utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_EMAIL = 'isaacmray1984@gmail.com';

export async function createUser(email: string, displayName?: string, poolId?: string) {
  const supabase = await createClient();
  
  // Get current user and verify admin
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return { success: false, message: 'Unauthorized - admin access required' };
  }

  try {
    // Generate a unique ID for the placeholder user
    const userId = uuidv4();
    
    // Check if a player with this display name already exists in the pool
    const playerName = displayName || email.split('@')[0];
    
    if (poolId) {
      // Check if player name already exists
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('pool_id', poolId)
        .eq('display_name', playerName)
        .single();

      if (existingPlayer) {
        return { success: false, message: 'A player with this name already exists in the pool' };
      }

      // Get pool details
      const { data: pool } = await supabase
        .from('pools')
        .select('starting_lives')
        .eq('id', poolId)
        .single();

      // Create player record with a placeholder user_id
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          pool_id: poolId,
          user_id: userId,
          display_name: playerName,
          lives_remaining: pool?.starting_lives || 3,
          is_eliminated: false
        });

      if (playerError) {
        return { success: false, message: `Failed to add player to pool: ${playerError.message}` };
      }
    }

    return { 
      success: true, 
      message: `Player '${playerName}' added to the pool successfully. You can now submit picks on their behalf.`, 
      userId 
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, message: 'An error occurred while processing the request' };
  }
}

export async function isUserAdmin(email: string): Promise<boolean> {
  return email === ADMIN_EMAIL;
}