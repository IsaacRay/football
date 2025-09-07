'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getCurrentNFLWeek } from '../lib/weekCalculator';
import { getGamesByWeek, getAllTeams, updateGameWinner, getPlayersByPool, getDefaultPool, getPicksByPlayer, submitPick, updatePick, getExistingPick, getAvailableTeams } from '../lib/supabaseQueries';
import type { Game, Team, Player, Pool, Pick } from '../lib/supabaseQueries';
import { createClient } from '../utils/supabase/client';
import { createUser } from '../actions/admin';

const ADMIN_EMAIL = 'isaacmray1984@gmail.com';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'users' | 'picks'>('games');
  const [pool, setPool] = useState<Pool | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedPickWeek, setSelectedPickWeek] = useState(1);
  const [selectedPickTeam, setSelectedPickTeam] = useState<string>('');
  const [addingPick, setAddingPick] = useState(false);
  const [playerPicks, setPlayerPicks] = useState<Pick[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);

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
      setSelectedPickWeek(currentWeek);
      loadData(currentWeek);
      loadPoolAndPlayers();
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

  const loadPoolAndPlayers = async () => {
    try {
      const defaultPool = await getDefaultPool();
      if (defaultPool) {
        setPool(defaultPool);
        const poolPlayers = await getPlayersByPool(defaultPool.id);
        setPlayers(poolPlayers);
        if (poolPlayers.length > 0 && !selectedPlayer) {
          setSelectedPlayer(poolPlayers[0].id);
          await loadPlayerPicks(poolPlayers[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading pool data:', error);
    }
  };

  const loadPlayerPicks = async (playerId: string) => {
    try {
      const picks = await getPicksByPlayer(playerId);
      setPlayerPicks(picks);
      const available = await getAvailableTeams(playerId);
      setAvailableTeams(available);
      if (available.length > 0 && !selectedPickTeam) {
        setSelectedPickTeam(available[0].id);
      }
    } catch (error) {
      console.error('Error loading player picks:', error);
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

  const handleCreateUser = async () => {
    if (!newUserEmail || !pool) return;
    
    setCreatingUser(true);
    try {
      const result = await createUser(newUserEmail, newUserDisplayName, pool.id);
      
      if (result.success) {
        // Reload players
        await loadPoolAndPlayers();
        setNewUserEmail('');
        setNewUserDisplayName('');
        alert(result.message);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert('Error creating user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAddPick = async () => {
    if (!selectedPlayer || !selectedPickTeam) return;
    
    setAddingPick(true);
    try {
      // Check if pick already exists
      const existingPick = await getExistingPick(selectedPlayer, selectedPickWeek);
      
      let success;
      if (existingPick) {
        success = await updatePick(selectedPlayer, selectedPickWeek, selectedPickTeam);
      } else {
        success = await submitPick({
          player_id: selectedPlayer,
          pool_id: pool!.id,
          week_number: selectedPickWeek,
          team_id: selectedPickTeam,
          is_correct: null
        });
      }
      
      if (success) {
        // Reload player picks
        await loadPlayerPicks(selectedPlayer);
        alert('Pick added successfully!');
      } else {
        alert('Error adding pick');
      }
    } catch (error) {
      alert('Error adding pick');
    } finally {
      setAddingPick(false);
    }
  };

  const handlePlayerChange = async (playerId: string) => {
    setSelectedPlayer(playerId);
    await loadPlayerPicks(playerId);
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
          <p className="mt-2 text-red-100">Manage Game Results, Users, and Picks</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('games')}
                className={`px-6 py-3 font-medium ${activeTab === 'games' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Game Results
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 font-medium ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('picks')}
                className={`px-6 py-3 font-medium ${activeTab === 'picks' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Pick Management
              </button>
            </div>
          </div>
        </div>

        {/* Game Results Tab */}
        {activeTab === 'games' && (
          <>
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
          </>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">User Management</h2>
              <p className="text-gray-600 mt-1">Create new users and manage existing players</p>
            </div>
            
            {/* Create User Form */}
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold mb-4">Create New User</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={newUserDisplayName}
                    onChange={(e) => setNewUserDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <button
                  onClick={handleCreateUser}
                  disabled={creatingUser || !newUserEmail}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
            
            {/* Existing Players List */}
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Existing Players</h3>
              <div className="space-y-2">
                {players.length === 0 ? (
                  <p className="text-gray-500">No players in the pool</p>
                ) : (
                  players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{player.display_name}</div>
                        <div className="text-sm text-gray-500">Lives: {player.lives_remaining}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.is_eliminated ? (
                          <span className="text-red-600 font-medium">Eliminated</span>
                        ) : (
                          <span className="text-green-600 font-medium">Active</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pick Management Tab */}
        {activeTab === 'picks' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Pick Management</h2>
              <p className="text-gray-600 mt-1">Add picks for players</p>
            </div>
            
            {/* Add Pick Form */}
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold mb-4">Add Pick</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="player" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Player
                  </label>
                  <select
                    id="player"
                    value={selectedPlayer}
                    onChange={(e) => handlePlayerChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.display_name} (Lives: {player.lives_remaining})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="week" className="block text-sm font-medium text-gray-700 mb-1">
                    Week
                  </label>
                  <select
                    id="week"
                    value={selectedPickWeek}
                    onChange={(e) => setSelectedPickWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                      <option key={week} value={week}>
                        Week {week}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
                    Team
                  </label>
                  <select
                    id="team"
                    value={selectedPickTeam}
                    onChange={(e) => setSelectedPickTeam(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableTeams.length === 0 ? (
                      <option value="">No available teams</option>
                    ) : (
                      availableTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.abbreviation})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  onClick={handleAddPick}
                  disabled={addingPick || !selectedPlayer || !selectedPickTeam}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {addingPick ? 'Adding...' : 'Add Pick'}
                </button>
              </div>
            </div>
            
            {/* Player Picks History */}
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Player Picks History</h3>
              {selectedPlayer && (
                <div className="space-y-2">
                  {playerPicks.length === 0 ? (
                    <p className="text-gray-500">No picks for this player</p>
                  ) : (
                    playerPicks.map((pick) => {
                      const team = teams.find(t => t.id === pick.team_id);
                      return (
                        <div key={pick.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">Week {pick.week_number}</div>
                            <div className="text-sm text-gray-500">
                              {team ? `${team.name} (${team.abbreviation})` : pick.team_id}
                            </div>
                          </div>
                          <div className="text-sm">
                            {pick.is_correct === true && (
                              <span className="text-green-600 font-medium">✓ Correct</span>
                            )}
                            {pick.is_correct === false && (
                              <span className="text-red-600 font-medium">✗ Incorrect</span>
                            )}
                            {pick.is_correct === null && (
                              <span className="text-gray-500">Pending</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
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