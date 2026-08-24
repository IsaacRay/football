import { isValidSeason } from './season';
import { DEFAULT_STARTING_LIVES } from './poolConfig';
import type { DbClient } from './scoreWeeks';

export interface SeasonResult {
  success: boolean;
  message: string;
  poolId?: string;
  playersAdded?: number;
  startingLives?: number;
  warnings?: string[];
}

export interface RemovalImpact {
  success: boolean;
  message?: string;
  displayName?: string;
  pickCount?: number;
}

export interface RemovalResult {
  success: boolean;
  message: string;
}

interface StartSeasonInput {
  season: number;
  startingLives?: number;
  /** Players from the current pool to carry into the new season. */
  carryOverPlayerIds: string[];
  name?: string;
}

/**
 * Opens a new season.
 *
 * A season is contained by its pool, so this creates a fresh pool row, copies
 * the chosen players into it at full lives, and deactivates the old pool.
 * Nothing is deleted: last season's pool, players and picks stay exactly as
 * they were, and anyone left out of carryOverPlayerIds simply doesn't get a
 * row in the new pool.
 */
export async function createSeason(
  supabase: DbClient,
  input: StartSeasonInput
): Promise<SeasonResult> {
  const { season, carryOverPlayerIds, name } = input;
  if (!isValidSeason(season)) {
    return { success: false, message: `Invalid season: ${season}` };
  }

  const { data: pools, error: poolsError } = await supabase
    .from('pools')
    .select('id, name, season, admin_id, starting_lives, is_active')
    .order('created_at', { ascending: false });

  if (poolsError) {
    if (/column .*season.* does not exist/i.test(poolsError.message) || poolsError.code === '42703') {
      return {
        success: false,
        message: 'pools.season does not exist yet - run add_season_support.sql first.',
      };
    }
    return { success: false, message: `Failed to read pools: ${poolsError.message}` };
  }

  const existing = (pools ?? []).find((p) => p.season === season);
  if (existing) {
    return {
      success: false,
      message: `A pool already exists for ${season} ("${existing.name}"). Delete it first if you want to start over.`,
    };
  }

  const previous = (pools ?? [])[0];
  const startingLives =
    input.startingLives ?? previous?.starting_lives ?? DEFAULT_STARTING_LIVES;

  if (!Number.isInteger(startingLives) || startingLives < 1) {
    return { success: false, message: 'Starting lives must be a positive whole number.' };
  }

  // Create the new pool BEFORE deactivating the old one. If this fails nothing
  // has changed, and the site is never left without an active pool.
  const { data: created, error: createError } = await supabase
    .from('pools')
    .insert({
      name: name?.trim() || `${season} Survivor Pool`,
      admin_id: previous?.admin_id ?? null,
      starting_lives: startingLives,
      current_week: 1,
      season,
      is_active: true,
    })
    .select('id, name')
    .single();

  if (createError || !created) {
    return { success: false, message: `Failed to create pool: ${createError?.message}` };
  }

  const warnings: string[] = [];

  // Retire every other pool so getDefaultPool lands on this one.
  const { error: deactivateError } = await supabase
    .from('pools')
    .update({ is_active: false })
    .eq('is_active', true)
    .neq('id', created.id);

  if (deactivateError) {
    warnings.push(`Could not deactivate the previous pool: ${deactivateError.message}`);
  }

  let playersAdded = 0;

  if (carryOverPlayerIds.length > 0) {
    const { data: sourcePlayers, error: sourceError } = await supabase
      .from('players')
      .select('display_name, user_id, email')
      .in('id', carryOverPlayerIds);

    if (sourceError) {
      warnings.push(`Could not read players to carry over: ${sourceError.message}`);
    } else if (sourcePlayers && sourcePlayers.length > 0) {
      const { error: insertError, count } = await supabase.from('players').insert(
        sourcePlayers.map((p) => ({
          pool_id: created.id,
          user_id: p.user_id,
          display_name: p.display_name,
          // Carries the login link across, so returning players don't need a
          // fresh invite.
          email: p.email ?? null,
          lives_remaining: startingLives,
          is_eliminated: false,
        })),
        { count: 'exact' }
      );

      if (insertError) {
        warnings.push(`Failed to add players: ${insertError.message}`);
      } else {
        playersAdded = count ?? sourcePlayers.length;
      }
    }
  }

  return {
    success: true,
    poolId: created.id,
    playersAdded,
    startingLives,
    message:
      `Created "${created.name}" with ${playersAdded} player(s) at ${startingLives} lives. ` +
      `Next: sync the ${season} schedule.`,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * How much history a removal would destroy. Call this before removePlayer so
 * the admin sees what they're about to lose.
 */
export async function playerRemovalImpact(
  supabase: DbClient,
  playerId: string
): Promise<RemovalImpact> {
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, display_name')
    .eq('id', playerId)
    .single();

  if (playerError || !player) {
    return { success: false, message: 'Player not found' };
  }

  const { count, error: picksError } = await supabase
    .from('picks')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId);

  if (picksError) {
    return { success: false, message: `Failed to count picks: ${picksError.message}` };
  }

  return { success: true, displayName: player.display_name, pickCount: count ?? 0 };
}

/**
 * Removes a player from their pool.
 *
 * picks.player_id is ON DELETE CASCADE, so this also deletes that player's
 * picks for this season - they vanish from the all-picks page. Only this
 * season's rows are affected; a player row in an earlier season's pool is a
 * separate record and is left alone.
 */
export async function removePlayerFromPool(
  supabase: DbClient,
  playerId: string
): Promise<RemovalResult> {
  const impact = await playerRemovalImpact(supabase, playerId);
  if (!impact.success) {
    return { success: false, message: impact.message ?? 'Player not found' };
  }

  const { error } = await supabase.from('players').delete().eq('id', playerId);

  if (error) {
    return { success: false, message: `Failed to remove player: ${error.message}` };
  }

  return {
    success: true,
    message:
      `Removed ${impact.displayName}` +
      (impact.pickCount ? ` and their ${impact.pickCount} pick(s).` : '.'),
  };
}
