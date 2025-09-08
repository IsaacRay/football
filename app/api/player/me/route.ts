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
    
    // Get default pool
    const { data: defaultPool } = await supabase
      .from('pools')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!defaultPool) {
      return NextResponse.json({ error: 'No active pool found' }, { status: 404 });
    }

    // Find player by display_name matching email prefix (cookie-based auth only)
    const displayName = user.email.split('@')[0];
    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('pool_id', defaultPool.id)
      .eq('display_name', displayName)
      .single();

    if (error || !player) {
      // No player exists for this user - they might need to be added manually by admin
      return NextResponse.json({ error: 'No player record found for this user' }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error getting player:', error);
    return NextResponse.json({ error: 'Failed to get player data' }, { status: 500 });
  }
}