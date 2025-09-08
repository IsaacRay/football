import { NextResponse } from 'next/server';
import { getDefaultPool, getPlayersWithPickCounts } from '../../lib/supabaseQueries';

export async function GET() {
  try {
    const pool = await getDefaultPool();
    
    if (!pool) {
      return NextResponse.json({ error: 'No default pool found' }, { status: 404 });
    }
    
    const players = await getPlayersWithPickCounts(pool.id);
    
    return NextResponse.json(players);
  } catch (error) {
    console.error('API Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}