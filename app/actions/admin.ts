'use server';

import { createClient } from '../utils/supabase/server';
import { DEFAULT_STARTING_LIVES } from '../lib/poolConfig';
import {
  getUser,
  isAdmin,
  createMagicLinkToken,
  INVITE_TOKEN_TTL_MS,
} from '../lib/simpleAuth';
import { isEmailConfigured, magicLinkUrl, sendInviteEmail } from '../lib/email';

export async function createUser(email: string, displayName?: string, poolId?: string) {
  const supabase = await createClient();
  
  // Get current user and verify admin using new auth system
  const user = await getUser();
  
  if (!user || !isAdmin(user.email)) {
    return { success: false, message: 'Unauthorized - admin access required' };
  }

  try {
    // The email is what links this player to a login, so it's the identity.
    // display_name is now purely cosmetic and free to be anything.
    const normalizedEmail = email.trim().toLowerCase();
    const playerName = displayName?.trim() || normalizedEmail.split('@')[0];

    if (poolId) {
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('pool_id', poolId)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingPlayer) {
        return { success: false, message: `${normalizedEmail} is already in the pool` };
      }

      // Get pool details
      const { data: pool } = await supabase
        .from('pools')
        .select('starting_lives')
        .eq('id', poolId)
        .single();

      // Create player record (no auth needed since we use cookie-based auth)
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          pool_id: poolId,
          user_id: null,
          display_name: playerName,
          email: normalizedEmail,
          lives_remaining: pool?.starting_lives ?? DEFAULT_STARTING_LIVES,
          is_eliminated: false
        });

      if (playerError) {
        return { success: false, message: `Failed to add player to pool: ${playerError.message}` };
      }
    }

    return {
      success: true,
      message: `Added ${playerName} (${normalizedEmail}). Use Send Invite to email them a sign-in link.`
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, message: 'An error occurred while processing the request' };
  }
}

/**
 * Sets or corrects a player's email. This is what links them to a login, so
 * it's also how you migrate a player created before emails were stored.
 */
export async function setPlayerEmail(playerId: string, email: string) {
  const user = await getUser();
  if (!user || !isAdmin(user.email)) {
    return { success: false, message: 'Unauthorized - admin access required' };
  }

  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    return { success: false, message: `"${email}" doesn't look like an email address` };
  }

  const supabase = await createClient();

  const { data: player } = await supabase
    .from('players')
    .select('id, pool_id')
    .eq('id', playerId)
    .single();

  if (!player) return { success: false, message: 'Player not found' };

  // Two players sharing an address would make the login match ambiguous.
  const { data: clash } = await supabase
    .from('players')
    .select('id, display_name')
    .eq('pool_id', player.pool_id)
    .eq('email', normalized)
    .neq('id', playerId)
    .maybeSingle();

  if (clash) {
    return { success: false, message: `${normalized} is already used by ${clash.display_name}` };
  }

  const { error } = await supabase
    .from('players')
    .update({ email: normalized })
    .eq('id', playerId);

  if (error) {
    return { success: false, message: `Failed to save email: ${error.message}` };
  }

  return { success: true, message: `Email set to ${normalized}` };
}

/**
 * Emails a player a sign-in link.
 *
 * The link is an ordinary magic-link token, so clicking it signs them in as
 * that address - no password, no separate acceptance step. Invites last 7 days
 * rather than the 10 minutes a self-service login link gets, because the
 * recipient isn't sitting at their computer waiting for it.
 */
export async function sendInvite(playerId: string) {
  const user = await getUser();
  if (!user || !isAdmin(user.email)) {
    return { success: false, message: 'Unauthorized - admin access required' };
  }

  const supabase = await createClient();

  const { data: player } = await supabase
    .from('players')
    .select('id, display_name, email, pool_id')
    .eq('id', playerId)
    .single();

  if (!player) return { success: false, message: 'Player not found' };
  if (!player.email) {
    return { success: false, message: `${player.display_name} has no email address yet - set one first.` };
  }

  const { data: pool } = await supabase
    .from('pools')
    .select('name, starting_lives')
    .eq('id', player.pool_id)
    .single();

  const token = await createMagicLinkToken(player.email, INVITE_TOKEN_TTL_MS);
  const link = magicLinkUrl(token);

  if (!isEmailConfigured()) {
    console.log('Invite link for', player.email, ':', link);
    return {
      success: true,
      link,
      message: `Email isn't configured, so nothing was sent. Copy this link to ${player.email}:\n\n${link}`,
    };
  }

  const result = await sendInviteEmail(
    player.email,
    link,
    pool?.name ?? 'the pool',
    pool?.starting_lives ?? DEFAULT_STARTING_LIVES
  );

  if (!result.ok) {
    return { success: false, message: `Failed to send invite: ${result.error}` };
  }

  return { success: true, message: `Invite sent to ${player.email}. The link works for 7 days.` };
}
