'use server';

import { createClient } from '../utils/supabase/server';
import { getCurrentNFLWeek } from '../lib/weekCalculator';

export async function processMissedPicks(poolId: string) {
  const supabase = await createClient();

  try {
    const currentWeek = getCurrentNFLWeek();

    // Get all players in the pool
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('pool_id', poolId);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return { success: false, message: 'Failed to fetch players', processed: 0, livesDeducted: 0 };
    }

    if (!players || players.length === 0) {
      return { success: true, message: 'No players found', processed: 0, livesDeducted: 0 };
    }

    let totalPlayersProcessed = 0;
    let totalLivesDeducted = 0;
    const updates = [];

    // Process each player
    for (const player of players) {
      // Get all picks for this player
      const { data: picks, error: picksError } = await supabase
        .from('picks')
        .select('week_number')
        .eq('player_id', player.id);

      if (picksError) {
        console.error(`Error fetching picks for player ${player.id}:`, picksError);
        continue;
      }

      const pickedWeeks = new Set(picks?.map(p => p.week_number) || []);
      let livesLost = 0;

      // Check each week from 1 to currentWeek - 1
      for (let week = 1; week < currentWeek; week++) {
        if (!pickedWeeks.has(week)) {
          livesLost++;
        }
      }

      // Only update if lives need to be deducted
      if (livesLost > 0) {
        const newLivesRemaining = Math.max(0, player.lives_remaining - livesLost);
        const isEliminated = newLivesRemaining === 0;

        updates.push({
          playerId: player.id,
          playerName: player.display_name,
          livesLost,
          newLivesRemaining,
          isEliminated
        });

        // Update player in database
        const { error: updateError } = await supabase
          .from('players')
          .update({
            lives_remaining: newLivesRemaining,
            is_eliminated: isEliminated
          })
          .eq('id', player.id);

        if (updateError) {
          console.error(`Error updating player ${player.id}:`, updateError);
        } else {
          totalPlayersProcessed++;
          totalLivesDeducted += livesLost;
        }
      }
    }

    return {
      success: true,
      message: `Processed ${totalPlayersProcessed} players with missed picks`,
      processed: totalPlayersProcessed,
      livesDeducted: totalLivesDeducted,
      updates
    };
  } catch (error) {
    console.error('Error processing missed picks:', error);
    return {
      success: false,
      message: 'An error occurred while processing missed picks',
      processed: 0,
      livesDeducted: 0
    };
  }
}

// Check missed picks for a single player
export async function checkPlayerMissedPicks(playerId: string) {
  const supabase = await createClient();

  try {
    const currentWeek = getCurrentNFLWeek();

    // Get player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return { success: false, message: 'Player not found' };
    }

    // Get all picks for this player
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select('week_number')
      .eq('player_id', playerId);

    if (picksError) {
      return { success: false, message: 'Failed to fetch picks' };
    }

    const pickedWeeks = new Set(picks?.map(p => p.week_number) || []);
    let livesLost = 0;
    const missedWeeks = [];

    // Check each week from 1 to currentWeek - 1
    for (let week = 1; week < currentWeek; week++) {
      if (!pickedWeeks.has(week)) {
        livesLost++;
        missedWeeks.push(week);
      }
    }

    // Only update if lives need to be deducted
    if (livesLost > 0) {
      const newLivesRemaining = Math.max(0, player.lives_remaining - livesLost);
      const isEliminated = newLivesRemaining === 0;

      // Update player in database
      const { error: updateError } = await supabase
        .from('players')
        .update({
          lives_remaining: newLivesRemaining,
          is_eliminated: isEliminated
        })
        .eq('id', playerId);

      if (updateError) {
        return { success: false, message: 'Failed to update player' };
      }

      return {
        success: true,
        livesDeducted: livesLost,
        missedWeeks,
        newLivesRemaining,
        isEliminated
      };
    }

    return {
      success: true,
      livesDeducted: 0,
      missedWeeks: [],
      newLivesRemaining: player.lives_remaining,
      isEliminated: player.is_eliminated
    };
  } catch (error) {
    console.error('Error checking player missed picks:', error);
    return { success: false, message: 'An error occurred' };
  }
}
