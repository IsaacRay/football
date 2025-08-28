'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getCurrentNFLWeek } from '../lib/weekCalculator';
import { getGamesByWeek, getAllTeams, updateGameWinner } from '../lib/supabaseQueries';
import type { Game, Team } from '../lib/supabaseQueries';

const ADMIN_EMAIL = 'isaacmray1984@gmail.com';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      if (user.email !== ADMIN_EMAIL) {
        router.push('/');
        return;
      }
      
      // Set default week to current week
      const currentWeek = getCurrentNFLWeek();
      setSelectedWeek(currentWeek);
      loadData(currentWeek);
    }
  }, [user, loading, router]);

  const loadData = async (week: number) => {
    setDataLoading(true);
    try {
      const [weekGames, allTeams] = await Promise.all([
        getGamesByWeek(week),
        getAllTeams()
      ]);
      setGames(weekGames);
      setTeams(allTeams);
    } catch (error) {
      // Handle error silently
    } finally {
      setDataLoading(false);
    }
  };

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    loadData(week);
  };

  const handleGameWinnerUpdate = async (gameId: string, winnerId: string | null) => {
    setSaving(gameId);
    try {
      const success = await updateGameWinner(gameId, winnerId);
      if (success) {
        // Reload data to show updated results
        await loadData(selectedWeek);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setSaving(null);
    }
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.abbreviation : teamId.toUpperCase();
  };

  const formatGameTime = (gameTime: string) => {
    const date = new Date(gameTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-red-600 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <p className="mt-2 text-red-100">Manage Game Results</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Week selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Select Week</h2>
          <select
            value={selectedWeek}
            onChange={(e) => handleWeekChange(Number(e.target.value))}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>
                Week {week} {week === getCurrentNFLWeek() && '(Current)'}
              </option>
            ))}
          </select>
        </div>

        {/* Games list */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Week {selectedWeek} Games</h2>
            <p className="text-gray-600 mt-1">Select the winner for each completed game</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {games.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No games found for Week {selectedWeek}
              </div>
            ) : (
              games.map((game) => (
                <div key={game.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="text-lg font-medium">
                          {getTeamName(game.away_team)} @ {getTeamName(game.home_team)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatGameTime(game.game_time)}
                        </div>
                        {game.is_complete && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            Final
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <select
                        value={game.winner || ''}
                        onChange={(e) => handleGameWinnerUpdate(game.id, e.target.value || null)}
                        disabled={saving === game.id}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="">Select Winner</option>
                        <option value={game.away_team}>{getTeamName(game.away_team)} (Away)</option>
                        <option value={game.home_team}>{getTeamName(game.home_team)} (Home)</option>
                      </select>
                      
                      {saving === game.id && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Pool
          </button>
        </div>
      </div>
    </div>
  );
}