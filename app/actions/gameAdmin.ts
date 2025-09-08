'use server';

import { createClient } from '../utils/supabase/server';
import { getUser, isAdmin } from '../lib/simpleAuth';

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
    
    // Update all picks for this specific game when result is set
    if (winnerId && data && data.length > 0) {
      const game = data[0];
      console.log('Updating picks for game:', game.id, 'winner:', winnerId);
      
      // Get all picks for this week for teams that played in this game
      const { data: picks, error: picksError } = await supabase
        .from('picks')
        .select('*')
        .eq('week_number', game.week_number)
        .in('team_id', [game.away_team, game.home_team]);
      
      if (!picksError && picks) {
        console.log('Found picks to update for this game:', picks.length);
        
        // Update each pick's is_correct status and player lives
        for (const pick of picks) {
          const isCorrect = pick.team_id === winnerId;
          const wasCorrect = pick.is_correct;
          
          console.log(`Pick ${pick.id}: team ${pick.team_id}, winner ${winnerId}, was: ${wasCorrect}, now: ${isCorrect}`);
          
          // Update the pick
          await supabase
            .from('picks')
            .update({ is_correct: isCorrect })
            .eq('id', pick.id);
          
          // Update player lives if the result changed
          if (wasCorrect !== isCorrect) {
            if (isCorrect && wasCorrect === false) {
              // Pick changed from wrong to correct - give life back
              console.log(`Giving life back to player ${pick.player_id}`);
              
              // Get current lives first
              const { data: playerData } = await supabase
                .from('players')
                .select('lives_remaining')
                .eq('id', pick.player_id)
                .single();
              
              if (playerData) {
                const newLives = playerData.lives_remaining + 1;
                await supabase
                  .from('players')
                  .update({ 
                    lives_remaining: newLives,
                    is_eliminated: false
                  })
                  .eq('id', pick.player_id);
              }
            } else if (!isCorrect && wasCorrect !== false) {
              // Pick is now wrong (either from correct or null) - take life
              console.log(`Taking life from player ${pick.player_id}`);
              
              // Get current lives to check if player should be eliminated
              const { data: playerData } = await supabase
                .from('players')
                .select('lives_remaining')
                .eq('id', pick.player_id)
                .single();
              
              if (playerData) {
                const newLives = Math.max(0, playerData.lives_remaining - 1);
                await supabase
                  .from('players')
                  .update({ 
                    lives_remaining: newLives,
                    is_eliminated: newLives === 0
                  })
                  .eq('id', pick.player_id);
              }
            }
          }
        }
        
        console.log('Picks and player lives updated successfully');
      } else {
        console.error('Error fetching picks:', picksError);
      }
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
}