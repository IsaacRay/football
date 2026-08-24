import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../utils/supabase/service';
import { scoreWeeks } from '../../../lib/scoreWeeks';
import { getCurrentSeason, isValidSeason, weeksInSeason } from '../../../lib/season';

export const dynamic = 'force-dynamic';
// ESPN calls plus a full recompute can take a while on a catch-up run.
export const maxDuration = 60;

/**
 * Settles finished weeks: pulls final scores from ESPN, sets each game's winner,
 * marks every pick right or wrong, and recomputes remaining lives.
 *
 * Intended to run once a week after Monday night football, but it is safe to
 * call at any time and as often as you like - lives are recomputed from the
 * full season's results rather than incremented, so repeat runs are no-ops.
 *
 * No auth: this is a public endpoint, so anything can trigger it. That is safe
 * only because the job is idempotent and takes no caller input beyond a season
 * and a week - every result it writes comes from ESPN, so the worst a stranger
 * can do is make it recompute the same answer.
 *
 * Query params (all optional):
 *   season=2026   default: the current NFL season, by date
 *   week=5        default: every week that still has unfinished games
 *   dryRun=true   report what would change without writing anything
 *
 *   GET  /api/admin/score-week?dryRun=true
 *   POST /api/admin/score-week
 */
async function handle(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const season = params.has('season') ? Number(params.get('season')) : getCurrentSeason();
  if (!isValidSeason(season)) {
    return NextResponse.json({ error: 'Invalid season' }, { status: 400 });
  }

  const lastWeek = weeksInSeason(season);
  let week: number | undefined;
  if (params.has('week')) {
    week = Number(params.get('week'));
    if (!Number.isInteger(week) || week < 1 || week > lastWeek) {
      return NextResponse.json(
        { error: `Invalid week (expected 1-${lastWeek} for ${season})` },
        { status: 400 }
      );
    }
  }

  const dryRun = params.get('dryRun') === 'true' || params.get('dryRun') === '1';

  try {
    const supabase = createServiceClient();
    const result = await scoreWeeks(supabase, { season, week, dryRun });

    return NextResponse.json({
      success: true,
      message: summarise(result),
      ...result,
    });
  } catch (error) {
    console.error('score-week failed:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;


function summarise(result: Awaited<ReturnType<typeof scoreWeeks>>): string {
  const prefix = result.dryRun ? 'Dry run: would set' : 'Set';
  const parts = [
    `${prefix} ${result.gamesUpdated.length} game result(s)`,
    `${result.picksUpdated.length} pick(s) rescored`,
    `${result.playersUpdated.length} player life total(s) changed`,
  ];
  if (result.ties.length) parts.push(`${result.ties.length} tie(s)`);
  if (result.warnings.length) parts.push(`${result.warnings.length} warning(s)`);
  return parts.join(', ');
}
