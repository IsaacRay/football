import { NextRequest, NextResponse } from 'next/server';
import { getUser, isAdmin } from '../../../lib/simpleAuth';
import { processMissedPicks } from '../../../actions/missedPicks';
import { getDefaultPool } from '../../../lib/supabaseQueries';

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const user = await getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      );
    }

    // Get the default pool
    const pool = await getDefaultPool();

    if (!pool) {
      return NextResponse.json(
        { error: 'No active pool found' },
        { status: 404 }
      );
    }

    // Process missed picks
    const result = await processMissedPicks(pool.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      livesDeducted: result.livesDeducted,
      updates: result.updates,
      message: result.message
    });
  } catch (error) {
    console.error('Error processing missed picks:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing missed picks' },
      { status: 500 }
    );
  }
}
