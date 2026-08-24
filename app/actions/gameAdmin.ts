'use server';

import { createClient } from '../utils/supabase/server';
import { getUser, isAdmin } from '../lib/simpleAuth';
import { recomputeSeason } from '../lib/scoreWeeks';

export async function updateGameWinnerAdmin(gameId: string, winnerId: string | null) {
  const supabase = await createClient();
  
  // Verify the user is admin using new auth system
  const user = await getUser();
  
  if (!user || !isAdmin(user.email)) {
    return { success: false, message: 'Unauthorized - admin access required' };
  }

  try {
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
      console.error('Error updating game winner:', error);
      
      // If RLS is blocking, we need to use a different approach
      if (error.code === '42501') { // Permission denied error
        return { 
          success: false, 
          message: 'Permission denied. Please run the following SQL in your Supabase dashboard:\n\n' +
                   'CREATE POLICY "Admin can update games" ON games\n' +
                   'FOR UPDATE USING (auth.jwt() ->> \'email\' = \'isaacmray1984@gmail.com\')\n' +
                   'WITH CHECK (auth.jwt() ->> \'email\' = \'isaacmray1984@gmail.com\');',
          requiresPolicy: true
        };
      }
      
      return { success: false, message: error.message };
    }
    
    console.log('Game updated successfully:', data);
    
    // Lives and pick correctness are DERIVED, not adjusted. Rather than add or
    // subtract a life here - which drifts as soon as the same game is edited
    // twice, or the weekly job has already counted it - re-derive the season
    // from the games table. This is the same code path the Tuesday job uses,
    // so a manual correction and an automated one can never disagree.
    //
    // Clearing a winner recomputes too; the old incremental path ignored that
    // case and left picks marked wrong for a game that no longer had a result.
    const game = data?.[0];
    if (game) {
      const recompute = await recomputeSeason(supabase, game.season);
      console.log(
        `Recomputed season ${game.season}: ${recompute.picksUpdated.length} pick(s), ` +
          `${recompute.playersUpdated.length} player(s)`
      );
      return { success: true, data, recompute };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
}
