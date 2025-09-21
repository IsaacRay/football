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
    let deletedCount = 0;
    let errors: string[] = [];

    // First, get all games with winners to preserve them
    const { data: gamesWithWinners } = await supabase
      .from('games')
      .select('id, week_number, away_team, home_team, winner')
      .eq('season', 2025)
      .not('winner', 'is', null);

    // Create a map of games with winners for easy lookup
    const preservedGames = new Map();
    if (gamesWithWinners) {
      gamesWithWinners.forEach(game => {
        const key = `${game.week_number}-${game.away_team}-${game.home_team}`;
        preservedGames.set(key, game);
      });
    }

    // Delete all games without winners
    const { error: deleteError, count } = await supabase
      .from('games')
      .delete()
      .eq('season', 2025)
      .is('winner', null);

    if (deleteError) {
      errors.push(`Error deleting games: ${deleteError.message}`);
    } else {
      deletedCount = count || 0;
    }

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

        // Check if this game was preserved (has a winner)
        const gameKey = `${game.Week}-${awayTeamId}-${homeTeamId}`;
        const preservedGame = preservedGames.get(gameKey);

        if (preservedGame) {
          // Game has a winner, just update the game time if needed
          const { error } = await supabase
            .from('games')
            .update({
              game_time: gameTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', preservedGame.id);

          if (error) {
            errors.push(`Error updating preserved game ${game.AwayTeam} @ ${game.HomeTeam}: ${error.message}`);
          } else {
            updatedCount++;
          }
        } else {
          // Game doesn't exist or was deleted - add it
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
      deleted: deletedCount,
      updated: updatedCount,
      added: addedCount,
      preserved: preservedGames.size,
      totalProcessed: scheduleGames.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sync schedule' }, { status: 500 });
  }
}