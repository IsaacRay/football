import { NextRequest, NextResponse } from 'next/server';
import { getUser, isAdmin } from '../../../lib/simpleAuth';
import { createClient } from '../../../utils/supabase/server';

// Map SportsData team abbreviations to our database IDs
const TEAM_MAPPING: Record<string, string> = {
  'BUF': 'buf', 'MIA': 'mia', 'NE': 'ne', 'NYJ': 'nyj',
  'BAL': 'bal', 'CIN': 'cin', 'CLE': 'cle', 'PIT': 'pit',
  'HOU': 'hou', 'IND': 'ind', 'JAX': 'jax', 'TEN': 'ten',
  'DEN': 'den', 'KC': 'kc', 'LV': 'lv', 'LAC': 'lac',
  'DAL': 'dal', 'NYG': 'nyg', 'PHI': 'phi', 'WAS': 'was',
  'CHI': 'chi', 'DET': 'det', 'GB': 'gb', 'MIN': 'min',
  'ATL': 'atl', 'CAR': 'car', 'NO': 'no', 'TB': 'tb',
  'ARI': 'ari', 'LAR': 'lar', 'SF': 'sf', 'SEA': 'sea'
};

interface SportsDataScheduleGame {
  Week: number;
  AwayTeam: string;
  HomeTeam: string;
  Date: string;
  DateTime: string;
  GameKey: string;
  Status?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const user = await getUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch schedule data from SportsData API
    const response = await fetch(
      `https://api.sportsdata.io/v3/nfl/scores/json/SchedulesBasic/2025?key=7c029cf040694724a7ce622847ed70ad`
    );
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch schedule from SportsData' }, { status: 500 });
    }

    const scheduleGames: SportsDataScheduleGame[] = await response.json();
    
    const supabase = await createClient();
    let updatedCount = 0;
    let addedCount = 0;
    let errors: string[] = [];

    for (const game of scheduleGames) {
      try {
        const awayTeamId = TEAM_MAPPING[game.AwayTeam];
        const homeTeamId = TEAM_MAPPING[game.HomeTeam];
        
        if (!awayTeamId || !homeTeamId) {
          errors.push(`Unknown team: ${game.AwayTeam} or ${game.HomeTeam}`);
          continue;
        }

        // Convert datetime to PostgreSQL timestamp
        const gameTime = new Date(game.DateTime).toISOString();

        // First, check if this game exists
        const { data: existingGame } = await supabase
          .from('games')
          .select('id, game_time')
          .eq('week_number', game.Week)
          .eq('away_team', awayTeamId)
          .eq('home_team', homeTeamId)
          .eq('season', 2025)
          .single();

        if (existingGame) {
          // Game exists - check if time has changed
          const existingTime = new Date(existingGame.game_time).toISOString();
          if (existingTime !== gameTime) {
            // Update the game time
            const { error } = await supabase
              .from('games')
              .update({
                game_time: gameTime,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingGame.id);

            if (error) {
              errors.push(`Error updating ${game.AwayTeam} @ ${game.HomeTeam}: ${error.message}`);
            } else {
              updatedCount++;
            }
          }
        } else {
          // Game doesn't exist - add it
          const { error } = await supabase
            .from('games')
            .insert({
              season: 2025,
              week_number: game.Week,
              away_team: awayTeamId,
              home_team: homeTeamId,
              game_time: gameTime,
              is_complete: false,
              winner: null
            });

          if (error) {
            errors.push(`Error adding ${game.AwayTeam} @ ${game.HomeTeam}: ${error.message}`);
          } else {
            addedCount++;
          }
        }
      } catch (error) {
        errors.push(`Error processing game: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Schedule sync complete`,
      updated: updatedCount,
      added: addedCount,
      totalProcessed: scheduleGames.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error syncing schedule:', error);
    return NextResponse.json({ error: 'Failed to sync schedule' }, { status: 500 });
  }
}