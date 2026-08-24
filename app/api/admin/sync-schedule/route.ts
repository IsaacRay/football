import { NextRequest, NextResponse } from 'next/server';
import { getUser, isAdmin } from '../../../lib/simpleAuth';
import { createClient } from '../../../utils/supabase/server';
import { fetchEspnSeason } from '../../../lib/espn';
import { getCurrentSeason, isValidSeason, weeksInSeason } from '../../../lib/season';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Loads a season's schedule into the games table.
 *
 * Games that already have a winner are preserved (only their kickoff time is
 * refreshed); everything else is wiped and rebuilt from ESPN, so this doubles
 * as the fix for a schedule that has since been flexed.
 *
 *   POST /api/admin/sync-schedule?season=2026
 *
 * Season defaults to the current one. Admin only.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const seasonParam = request.nextUrl.searchParams.get('season');
  const season = seasonParam ? Number(seasonParam) : getCurrentSeason();
  if (!isValidSeason(season)) {
    return NextResponse.json({ error: 'Invalid season' }, { status: 400 });
  }

  try {
    const scheduleGames = await fetchEspnSeason(season, weeksInSeason(season));

    if (scheduleGames.length === 0) {
      return NextResponse.json(
        { error: `ESPN returned no games for ${season}. Is the schedule published yet?` },
        { status: 502 }
      );
    }

    const supabase = await createClient();
    const errors: string[] = [];
    let updatedCount = 0;
    let addedCount = 0;
    let deletedCount = 0;

    // Preserve any game already carrying a result so a resync never erases history.
    const { data: gamesWithWinners } = await supabase
      .from('games')
      .select('id, week_number, away_team, home_team, winner')
      .eq('season', season)
      .not('winner', 'is', null);

    const preservedGames = new Map<string, { id: string }>();
    for (const game of gamesWithWinners ?? []) {
      preservedGames.set(`${game.week_number}-${game.away_team}-${game.home_team}`, game);
    }

    const { error: deleteError, count } = await supabase
      .from('games')
      .delete({ count: 'exact' })
      .eq('season', season)
      .is('winner', null);

    if (deleteError) {
      errors.push(`Error deleting games: ${deleteError.message}`);
    } else {
      deletedCount = count || 0;
    }

    for (const game of scheduleGames) {
      if (!game.awayTeam || !game.homeTeam) {
        errors.push(`Unknown team in ${game.awayAbbr} @ ${game.homeAbbr}`);
        continue;
      }

      const gameTime = new Date(game.date).toISOString();
      const preserved = preservedGames.get(`${game.week}-${game.awayTeam}-${game.homeTeam}`);

      if (preserved) {
        const { error } = await supabase
          .from('games')
          .update({ game_time: gameTime, updated_at: new Date().toISOString() })
          .eq('id', preserved.id);

        if (error) {
          errors.push(`Error updating ${game.shortName}: ${error.message}`);
        } else {
          updatedCount++;
        }
        continue;
      }

      const { error } = await supabase.from('games').insert({
        season,
        week_number: game.week,
        away_team: game.awayTeam,
        home_team: game.homeTeam,
        game_time: gameTime,
        is_complete: false,
        winner: null,
      });

      if (error) {
        errors.push(`Error adding ${game.shortName}: ${error.message}`);
      } else {
        addedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Schedule sync complete for ${season}`,
      season,
      deleted: deletedCount,
      updated: updatedCount,
      added: addedCount,
      preserved: preservedGames.size,
      totalProcessed: scheduleGames.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('sync-schedule failed:', error);
    return NextResponse.json(
      { error: `Failed to sync schedule: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
