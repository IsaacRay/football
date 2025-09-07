'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ADMIN_EMAIL = 'isaacmray1984@gmail.com';

export async function createUser(email: string, displayName?: string, poolId?: string) {
  // Check if the current user is admin
  const cookieStore = await cookies();
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false
    }
  });

  // Get current user
  const authCookie = cookieStore.get('supabase-auth-token');
  if (!authCookie) {
    return { success: false, message: 'Unauthorized' };
  }

  // For now, we'll skip the auth check and just create the user
  // In production, you'd want to properly verify the admin user

  try {
    let userId: string;
    let isNewUser = false;

    // First check if user already exists in auth.users by trying to get them from profiles or by listing users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    const existingUser = users?.find(u => u.email === email);

    if (existingUser) {
      // User already exists in auth
      userId = existingUser.id;
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          display_name: displayName || email.split('@')[0]
        }
      });

      if (authError) {
        return { success: false, message: authError.message };
      }

      if (!authData.user) {
        return { success: false, message: 'Failed to create user' };
      }

      userId = authData.user.id;
      isNewUser = true;
    }

    // If poolId provided, create or check player record
    if (poolId && userId) {
      // Check if player already exists for this user and pool
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('pool_id', poolId)
        .eq('user_id', userId)
        .single();

      if (existingPlayer) {
        return { success: false, message: 'Player already exists in this pool' };
      }

      // Get pool details
      const { data: pool } = await supabase
        .from('pools')
        .select('starting_lives')
        .eq('id', poolId)
        .single();

      // Create player record
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          pool_id: poolId,
          user_id: userId,
          display_name: displayName || email.split('@')[0],
          lives_remaining: pool?.starting_lives || 3,
          is_eliminated: false
        });

      if (playerError) {
        return { success: false, message: `Failed to add player to pool: ${playerError.message}` };
      }
    }

    // Send magic link to the user
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      }
    });

    if (magicLinkError) {
      return { 
        success: true, 
        message: isNewUser ? 'User created successfully but failed to send login email' : 'Player added to pool but failed to send login email', 
        userId 
      };
    }

    return { 
      success: true, 
      message: isNewUser ? 'User created and login email sent' : 'Player added to pool and login email sent', 
      userId 
    };
  } catch (error) {
    return { success: false, message: 'An error occurred while processing the request' };
  }
}

export async function isUserAdmin(email: string): Promise<boolean> {
  return email === ADMIN_EMAIL;
}