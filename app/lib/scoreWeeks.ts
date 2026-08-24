import { fetchEspnWeek, type EspnGame } from './espn';
import { weeksInSeason } from './season';
import { DEFAULT_STARTING_LIVES } from './poolConfig';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Either Supabase client works here - the cookie-based one from a server
 * action, or the cookie-free service client a background job uses.
 */
export type DbClient = SupabaseClient<any, any, any>;

// ============================================================================
// HOUSE RULES - change these two constants to change how the job scores.
// ============================================================================

/**
 * A tied game has no winner. With this true, a pick on either team is scored
 * wrong and costs a life. Set to false to treat a tie as a push: the pick is
 * left undecided (is_correct = null) and no life is lost.
 */
export const TIE_COUNTS_AS_LOSS = true;

/**
 * Deduct a life from players who submitted no pick for a fully finished week.
 * Players are never penalised for weeks that started before they joined.
 */
export const MISSED_PICK_COUNTS_AS_LOSS = true;

// ============================================================================

export interface ScoreOptions {
  season: number;
  /** Limit to a single week. Omitted = every week with unfinished games. */
  week?: number;
  /** Compute and report everything, write nothing. */
  dryRun?: boolean;
}

interface GameRow {
  id: string;
  week_number: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  game_time: string;
  is_complete: boolean;
  winner: string | null;
}

interface PickRow {
  id: string;
  player_id: string;
  week_number: number;
  team_id: string;
  is_correct: boolean | null;
}

interface PlayerRow {
  id: string;
  pool_id: string;
  display_name: string;
  lives_remaining: number;
  is_eliminated: boolean;
  joined_at: string;
}

export interface ScoreResult {
  season: number;
  dryRun: boolean;
  poolsScored: string[];
  weeksChecked: number[];
  gamesUpdated: Array<{
    week: number;
    matchup: string;
    score: string;
    winner: string | null;
    tie: boolean;
  }>;
  picksUpdated: Array<{
    week: number;
    player: string;
    team: string;
    from: boolean | null;
    to: boolean | null;
  }>;
  playersUpdated: Array<{
    player: string;
    livesFrom: number;
    livesTo: number;
    eliminated: boolean;
  }>;
  settledWeeks: number[];
  ties: string[];
  warnings: string[];
}

/**
 * Pull final scores from ESPN, set game winners, then recompute every pick and
 * every player's remaining lives from scratch.
 *
 * Lives are DERIVED (starting_lives minus counted losses), never incremented,
 * so running this repeatedly is safe: a second run on the same data is a no-op,
 * and a correction to any past game self-heals on the next run.
 *
 * Everything is scoped to one season. A season's pool rows carry the season,
 * players belong to a pool, and picks belong to a player - so scoring 2026
 * cannot disturb 2025's finished results.
 */
export async function scoreWeeks(
  supabase: DbClient,
  options: ScoreOptions
): Promise<ScoreResult> {
  const { season, week, dryRun = false } = options;
  const warnings: string[] = [];
  const ties: string[] = [];

  const games = await loadSeasonGames(supabase, season);

  // ---- 1. Decide which weeks to pull from ESPN ----------------------------
  const now = Date.now();
  const weeksToCheck = week
    ? [week]
    : Array.from(
        new Set(
          games
            .filter((g) => !g.is_complete && new Date(g.game_time).getTime() < now)
            .map((g) => g.week_number)
        )
      ).sort((a, b) => a - b);

  // ---- 2. Apply ESPN results to games ------------------------------------
  const gamesUpdated: ScoreResult['gamesUpdated'] = [];

  for (const weekNumber of weeksToCheck) {
    let espnGames: EspnGame[];
    try {
      espnGames = await fetchEspnWeek(season, weekNumber);
    } catch (error) {
      warnings.push(`Week ${weekNumber}: ${(error as Error).message}`);
      continue;
    }

    const weekGames = games.filter((g) => g.week_number === weekNumber);

    for (const espnGame of espnGames) {
      if (!espnGame.isFinal) continue;

      if (!espnGame.homeTeam || !espnGame.awayTeam) {
        warnings.push(
          `Week ${weekNumber}: unrecognised ESPN team in ${espnGame.awayAbbr} @ ${espnGame.homeAbbr}`
        );
        continue;
      }

      let dbGame = weekGames.find(
        (g) => g.home_team === espnGame.homeTeam && g.away_team === espnGame.awayTeam
      );
      let flipped = false;

      if (!dbGame) {
        // Same matchup with home/away reversed in our table - use it, but say so,
        // because the stored scores have to be swapped to stay correct.
        dbGame = weekGames.find(
          (g) => g.home_team === espnGame.awayTeam && g.away_team === espnGame.homeTeam
        );
        if (dbGame) {
          flipped = true;
          warnings.push(
            `Week ${weekNumber}: ${espnGame.shortName} is stored with home/away reversed; scored anyway`
          );
        }
      }

      if (!dbGame) {
        warnings.push(`Week ${weekNumber}: ${espnGame.shortName} not found in games table`);
        continue;
      }

      if (espnGame.isTie) {
        ties.push(`Week ${weekNumber}: ${espnGame.shortName} ended in a tie`);
      }

      const homeScore = flipped ? espnGame.awayScore : espnGame.homeScore;
      const awayScore = flipped ? espnGame.homeScore : espnGame.awayScore;

      const unchanged =
        dbGame.is_complete &&
        dbGame.winner === espnGame.winner &&
        dbGame.home_score === homeScore &&
        dbGame.away_score === awayScore;

      // Keep the in-memory copy authoritative for the recompute below, whether
      // or not we write it out.
      dbGame.is_complete = true;
      dbGame.winner = espnGame.winner;
      dbGame.home_score = homeScore;
      dbGame.away_score = awayScore;

      if (unchanged) continue;

      if (!dryRun) {
        const { error } = await supabase
          .from('games')
          .update({
            winner: espnGame.winner,
            home_score: homeScore,
            away_score: awayScore,
            is_complete: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dbGame.id);

        if (error) {
          warnings.push(`Week ${weekNumber}: failed to update ${espnGame.shortName}: ${error.message}`);
          continue;
        }
      }

      gamesUpdated.push({
        week: weekNumber,
        matchup: `${dbGame.away_team.toUpperCase()} @ ${dbGame.home_team.toUpperCase()}`,
        score: `${awayScore}-${homeScore}`,
        winner: espnGame.winner,
        tie: espnGame.isTie,
      });
    }
  }

  // ---- 3. Recompute picks and lives from the resulting game state -------
  const outcome = await recomputeFromGames(supabase, season, games, dryRun, warnings);

  return {
    season,
    dryRun,
    weeksChecked: weeksToCheck,
    gamesUpdated,
    ties,
    warnings,
    ...outcome,
  };
}

interface RecomputeOutcome {
  poolsScored: string[];
  settledWeeks: number[];
  picksUpdated: ScoreResult['picksUpdated'];
  playersUpdated: ScoreResult['playersUpdated'];
}

/**
 * Re-derive every pick and every life total for a season from whatever the
 * games table currently says, without consulting ESPN.
 *
 * This is the single place lives are decided. Both the weekly job and a manual
 * winner change in the admin UI go through it, so the two can never disagree.
 */
export async function recomputeSeason(
  supabase: DbClient,
  season: number,
  options: { dryRun?: boolean } = {}
): Promise<RecomputeOutcome & { season: number; dryRun: boolean; warnings: string[] }> {
  const dryRun = options.dryRun ?? false;
  const warnings: string[] = [];
  const games = await loadSeasonGames(supabase, season);
  const outcome = await recomputeFromGames(supabase, season, games, dryRun, warnings);
  return { season, dryRun, warnings, ...outcome };
}

async function recomputeFromGames(
  supabase: DbClient,
  season: number,
  games: GameRow[],
  dryRun: boolean,
  warnings: string[]
): Promise<RecomputeOutcome> {
  // ---- 3. Index game state by week and team ------------------------------
  const gamesByWeek = new Map<number, GameRow[]>();
  for (const game of games) {
    const list = gamesByWeek.get(game.week_number) ?? [];
    list.push(game);
    gamesByWeek.set(game.week_number, list);
  }

  // A week is "settled" once every one of its games has finished. Only then is
  // a missing pick a real miss rather than a pick that's still pending.
  const settledWeeks = new Set<number>();
  const weekStartTime = new Map<number, number>();
  for (const [weekNumber, weekGames] of gamesByWeek) {
    if (weekGames.every((g) => g.is_complete)) settledWeeks.add(weekNumber);
    weekStartTime.set(
      weekNumber,
      Math.min(...weekGames.map((g) => new Date(g.game_time).getTime()))
    );
  }

  const findGame = (weekNumber: number, teamId: string) =>
    (gamesByWeek.get(weekNumber) ?? []).find(
      (g) => g.home_team === teamId || g.away_team === teamId
    );

  // ---- 4. Find this season's pools and players ---------------------------
  const pools = await loadSeasonPools(supabase, season, warnings);

  const nothingScored = (): RecomputeOutcome => ({
    poolsScored: pools.map((p) => p.name),
    settledWeeks: Array.from(settledWeeks).sort((a, b) => a - b),
    picksUpdated: [],
    playersUpdated: [],
  });

  if (pools.length === 0) {
    warnings.push(
      `No pool found for season ${season}; game results were saved but no picks or lives were scored.`
    );
    return nothingScored();
  }

  const poolIds = pools.map((p) => p.id);
  const startingLives = new Map(pools.map((p) => [p.id, p.starting_lives ?? DEFAULT_STARTING_LIVES]));

  const { data: playerData, error: playersError } = await supabase
    .from('players')
    .select('id, pool_id, display_name, lives_remaining, is_eliminated, joined_at')
    .in('pool_id', poolIds);

  if (playersError) throw new Error(`Failed to load players: ${playersError.message}`);
  const players = (playerData ?? []) as PlayerRow[];

  if (players.length === 0) {
    warnings.push(`Season ${season} has no players yet; nothing to score.`);
    return nothingScored();
  }

  // ---- 5. Rescore this season's picks ------------------------------------
  const { data: pickData, error: picksError } = await supabase
    .from('picks')
    .select('id, player_id, week_number, team_id, is_correct')
    .in('player_id', players.map((p) => p.id));

  if (picksError) throw new Error(`Failed to load picks: ${picksError.message}`);
  const picks = (pickData ?? []) as PickRow[];

  const playerNames = new Map(players.map((p) => [p.id, p.display_name]));
  const picksUpdated: ScoreResult['picksUpdated'] = [];
  // player_id -> week -> resolved correctness
  const resolved = new Map<string, Map<number, boolean | null>>();

  for (const pick of picks) {
    const game = findGame(pick.week_number, pick.team_id);
    let desired: boolean | null = null;

    if (!game) {
      warnings.push(
        `Week ${pick.week_number}: no ${pick.team_id.toUpperCase()} game found for a submitted pick`
      );
    } else if (game.is_complete) {
      if (game.winner === null) {
        desired = TIE_COUNTS_AS_LOSS ? false : null;
      } else {
        desired = game.winner === pick.team_id;
      }
    }

    const byWeek = resolved.get(pick.player_id) ?? new Map<number, boolean | null>();
    byWeek.set(pick.week_number, desired);
    resolved.set(pick.player_id, byWeek);

    if (pick.is_correct === desired) continue;

    if (!dryRun) {
      const { error } = await supabase
        .from('picks')
        .update({ is_correct: desired, updated_at: new Date().toISOString() })
        .eq('id', pick.id);

      if (error) {
        warnings.push(`Failed to update pick ${pick.id}: ${error.message}`);
        continue;
      }
    }

    picksUpdated.push({
      week: pick.week_number,
      player: playerNames.get(pick.player_id) ?? pick.player_id,
      team: pick.team_id,
      from: pick.is_correct,
      to: desired,
    });
  }

  // ---- 6. Recompute lives from scratch -----------------------------------
  // Only weeks this season actually has, so a 17-week season doesn't get
  // penalised for a missing week 18.
  const allWeeks = Array.from(gamesByWeek.keys())
    .filter((w) => w >= 1 && w <= weeksInSeason(season))
    .sort((a, b) => a - b);

  const playersUpdated: ScoreResult['playersUpdated'] = [];

  for (const player of players) {
    const starting = startingLives.get(player.pool_id) ?? DEFAULT_STARTING_LIVES;
    const joinedAt = new Date(player.joined_at).getTime();
    const byWeek = resolved.get(player.id);
    let losses = 0;

    for (const weekNumber of allWeeks) {
      const hasPick = byWeek?.has(weekNumber) ?? false;

      if (hasPick) {
        // A losing pick counts as soon as that one game is final - no need to
        // wait for the rest of the week.
        if (byWeek!.get(weekNumber) === false) losses++;
        continue;
      }

      if (!MISSED_PICK_COUNTS_AS_LOSS) continue;
      if (!settledWeeks.has(weekNumber)) continue;
      // Don't penalise a week that kicked off before this player joined.
      if (joinedAt > (weekStartTime.get(weekNumber) ?? Infinity)) continue;

      losses++;
    }

    const lives = Math.max(0, starting - losses);
    const eliminated = lives <= 0;

    if (lives === player.lives_remaining && eliminated === player.is_eliminated) continue;

    if (!dryRun) {
      const { error } = await supabase
        .from('players')
        .update({ lives_remaining: lives, is_eliminated: eliminated })
        .eq('id', player.id);

      if (error) {
        warnings.push(`Failed to update ${player.display_name}: ${error.message}`);
        continue;
      }
    }

    playersUpdated.push({
      player: player.display_name,
      livesFrom: player.lives_remaining,
      livesTo: lives,
      eliminated,
    });
  }

  return {
    ...nothingScored(),
    picksUpdated,
    playersUpdated,
  };
}

async function loadSeasonGames(supabase: DbClient, season: number): Promise<GameRow[]> {
  const { data, error } = await supabase
    .from('games')
    .select('id, week_number, home_team, away_team, home_score, away_score, game_time, is_complete, winner')
    .eq('season', season)
    .order('week_number')
    .order('game_time');

  if (error) throw new Error(`Failed to load games: ${error.message}`);

  const games = (data ?? []) as GameRow[];
  if (games.length === 0) {
    throw new Error(
      `No games found for season ${season}. Sync the schedule for that season first ` +
        `(POST /api/admin/sync-schedule?season=${season}).`
    );
  }
  return games;
}

interface PoolRow {
  id: string;
  name: string;
  starting_lives: number | null;
  season?: number | null;
}

/**
 * Pools for one season.
 *
 * pools.season is what separates one year from the next. If that column hasn't
 * been added yet (see add_season_support.sql) the query fails, and rather than
 * blow up we fall back to every active pool and say so - which is the correct
 * behaviour for a database that only holds one season anyway.
 */
async function loadSeasonPools(
  supabase: DbClient,
  season: number,
  warnings: string[]
): Promise<PoolRow[]> {
  const { data, error } = await supabase
    .from('pools')
    .select('id, name, starting_lives, season')
    .eq('season', season);

  if (!error) return (data ?? []) as PoolRow[];

  if (!isMissingColumnError(error)) {
    throw new Error(`Failed to load pools: ${error.message}`);
  }

  warnings.push(
    'pools.season does not exist yet - run add_season_support.sql. ' +
      'Falling back to every active pool, which is only correct while the database holds a single season.'
  );

  const { data: fallback, error: fallbackError } = await supabase
    .from('pools')
    .select('id, name, starting_lives')
    .eq('is_active', true);

  if (fallbackError) throw new Error(`Failed to load pools: ${fallbackError.message}`);
  return (fallback ?? []) as PoolRow[];
}

function isMissingColumnError(error: { code?: string; message?: string }): boolean {
  // Postgres 42703 = undefined_column; PostgREST reports it as PGRST204 / a
  // "column ... does not exist" message depending on version.
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column .*season.* does not exist/i.test(error.message ?? '')
  );
}
