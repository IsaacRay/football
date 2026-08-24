import { NextResponse } from 'next/server';
import { getUser } from '../../../lib/simpleAuth';
import { createClient } from '../../../utils/supabase/server';

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: pool } = await supabase
      .from('pools')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pool) {
      return NextResponse.json({ error: 'No active pool found' }, { status: 404 });
    }

    // Match on the player's email address.
    const byEmail = await supabase
      .from('players')
      .select('*')
      .eq('pool_id', pool.id)
      .eq('email', user.email)
      .maybeSingle();

    if (byEmail.data) {
      return NextResponse.json(byEmail.data);
    }

    // Fallback for players added before emails were stored (and for databases
    // where add_player_email.sql hasn't been run): the old rule matched
    // display_name against the part of the email before the "@".
    const prefix = user.email.split('@')[0];
    const { data: legacy } = await supabase
      .from('players')
      .select('*')
      .eq('pool_id', pool.id)
      .eq('display_name', prefix)
      .maybeSingle();

    if (legacy) {
      return NextResponse.json(legacy);
    }

    return NextResponse.json({ error: 'No player record found for this user' }, { status: 404 });
  } catch (error) {
    console.error('Error getting player:', error);
    return NextResponse.json({ error: 'Failed to get player data' }, { status: 500 });
  }
}
