'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navigation from './components/Navigation';
import PoolRules from './components/PoolRules';
import Leaderboard from './components/Leaderboard';
import TeamPicker from './components/TeamPicker';
import WeeklySchedule from './components/WeeklySchedule';
import PickHistory from './components/PickHistory';
import { getCurrentNFLWeek } from './lib/weekCalculator';
import { 
  getDefaultPool, 
  getPlayersByPool,
  getGamesByWeek,
  getPicksByPlayer,
  submitPick 
} from './lib/supabaseQueries';
import type { Pool, Player, Game, Pick } from './lib/supabaseQueries';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pool, setPool] = useState<Pool | null>(null);
  const [players, setPlayers] = useState<(Player & { pick_count: number })[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [dataLoading, setDataLoading] = useState(true);
  const [authCheckDelay, setAuthCheckDelay] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthCheckDelay(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      loadData();
    }
  }, [loading, user, router]);

  // Load fresh data when page becomes visible (handles refresh case)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && !loading) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also trigger on initial load if user is ready
    if (user && !loading) {
      loadData();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, loading]); // Depend on user and loading state


  const loadData = async () => {
    setDataLoading(true);
    
    try {
      // Get current week based on date
      const week = getCurrentNFLWeek();
      setCurrentWeek(week);

      // Get default pool
      const defaultPool = await getDefaultPool();
      if (!defaultPool) {
        console.error('No default pool found');
        alert('No active pool found. Please contact the administrator.');
        setDataLoading(false);
        return;
      }
      setPool(defaultPool);

      // Get current user's player record via API
      try {
        const response = await fetch('/api/player/me');
        let userPlayer = null;
        
        if (response.ok) {
          userPlayer = await response.json();
        } else {
          alert('No player record found. Please contact the admin to be added to the pool.');
          setDataLoading(false);
          return;
        }
        
        if (!userPlayer) {
          console.error('Failed to get player');
          alert('Failed to get player record. Please try again.');
          setDataLoading(false);
          return;
        }
        setCurrentPlayer(userPlayer);
      } catch (fetchError) {
        console.error('Error fetching player:', fetchError);
        alert('Failed to load player data. Please try again.');
        setDataLoading(false);
        return;
      }

      // Get all players in the pool via API to ensure fresh data
      const playersResponse = await fetch('/api/players', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const allPlayers = await playersResponse.json();
      setPlayers(allPlayers);

      // Get current week's games
      const weekGames = await getGamesByWeek(week);
      setGames(weekGames);

    } catch (error) {
      console.error('Error loading data:', error);
      alert(`Failed to load pool data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDataLoading(false);
    }
  };

  const handlePickSubmit = async (pick: Omit<Pick, 'id' | 'created_at' | 'updated_at'>) => {
    if (!currentPlayer || !pool) return;

    try {
      const success = await submitPick(pick);
      if (success) {
        alert('Pick submitted successfully!');
        // Reload data to show the new pick
        await loadData();
      } else {
        alert('Failed to submit pick. Please try again.');
      }
    } catch (error) {
      alert('Failed to submit pick. Please try again.');
    }
  };

  if (loading || dataLoading || authCheckDelay) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loading || authCheckDelay ? 'Authenticating...' : 'Loading pool data...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <PoolRules />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {currentPlayer ? (
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Week {currentWeek} Pick</h2>
                <TeamPicker
                  player={currentPlayer}
                  weekNumber={currentWeek}
                  onPickSubmit={handlePickSubmit}
                  onPickUpdate={loadData}
                />
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="text-yellow-800">Setting up your player profile...</p>
              </div>
            )}

            <WeeklySchedule games={games} weekNumber={currentWeek} />
          </div>

          <div className="lg:col-span-1">
            <Leaderboard players={players} />
          </div>
        </div>

        {currentPlayer && (
          <PickHistory player={currentPlayer} />
        )}
      </div>
    </main>
  );
}