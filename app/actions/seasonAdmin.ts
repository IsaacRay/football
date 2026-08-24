'use server';

import { createClient } from '../utils/supabase/server';
import { getUser, isAdmin } from '../lib/simpleAuth';
import {
  createSeason,
  playerRemovalImpact,
  removePlayerFromPool,
  type SeasonResult,
  type RemovalImpact,
  type RemovalResult,
} from '../lib/seasonSetup';

const UNAUTHORIZED = { success: false, message: 'Unauthorized - admin access required' };

async function requireAdmin() {
  const user = await getUser();
  return !!user && isAdmin(user.email);
}

export async function startNewSeason(input: {
  season: number;
  startingLives?: number;
  carryOverPlayerIds: string[];
  name?: string;
}): Promise<SeasonResult> {
  if (!(await requireAdmin())) return UNAUTHORIZED;
  return createSeason(await createClient(), input);
}

export async function getPlayerRemovalImpact(playerId: string): Promise<RemovalImpact> {
  if (!(await requireAdmin())) return UNAUTHORIZED;
  return playerRemovalImpact(await createClient(), playerId);
}

export async function removePlayer(playerId: string): Promise<RemovalResult> {
  if (!(await requireAdmin())) return UNAUTHORIZED;
  return removePlayerFromPool(await createClient(), playerId);
}
