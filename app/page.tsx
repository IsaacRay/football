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
  getCurrentUserPlayer, 
  createPlayerForCurrentUser,
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [dataLoading, setDataLoading] = useState(true);
  const [authCheckDelay, setAuthCheckDelay] = useState(true);

  useEffect(() => {
    // Check for auth-success cookie which indicates we just logged in
    const hasAuthSuccess = document.cookie.includes('auth-success=true');
    
    // If we just authenticated, wait a bit longer for auth state to settle
    const delay = hasAuthSuccess ? 2000 : 500;
    
    const timer = setTimeout(() => {
      setAuthCheckDelay(false);
    }, delay);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    // Only redirect after auth check delay and if we're sure there's no user
    if (!loading && !user && !authCheckDelay) {
      router.push('/login');
    }
  }, [loading, user, router, authCheckDelay]);

  const loadData = async () => {
    setDataLoading(true);
    
    try {
      // Get current week based on date
      const week = getCurrentNFLWeek();
      setCurrentWeek(week);
      console.log('Current NFL week:', week);

      // Get default pool
      const defaultPool = await getDefaultPool();
      console.log('Default pool:', defaultPool);
      if (!defaultPool) {
        console.error('No default pool found');
        alert('No active pool found. Please contact the administrator.');
        setDataLoading(false);
        return;
      }
      setPool(defaultPool);

      // Get current user's player record
      let userPlayer = await getCurrentUserPlayer(defaultPool.id);
      console.log('User player:', userPlayer);
      
      // If user doesn't have a player record, create one
      if (!userPlayer) {
        console.log('Creating new player for user');
        userPlayer = await createPlayerForCurrentUser(defaultPool.id);
        console.log('Created player:', userPlayer);
        if (!userPlayer) {
          console.error('Failed to create player');
          alert('Failed to create player record. Please try again.');
          setDataLoading(false);
          return;
        }
      }
      setCurrentPlayer(userPlayer);

      // Get all players in the pool
      const allPlayers = await getPlayersByPool(defaultPool.id);
      console.log('All players:', allPlayers);
      setPlayers(allPlayers);

      // Get current week's games
      const weekGames = await getGamesByWeek(week);
      console.log('Week games:', weekGames);
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