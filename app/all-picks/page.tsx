'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import {
  getDefaultPool,
  getPlayerWithPicksAndTeams,
  getAllTeams,
  getCurrentNFLWeek
} from '../lib/supabaseQueries';
import type { Pool, Player, Pick, Team } from '../lib/supabaseQueries';

interface PlayerWithData {
  player: Player;
  picks: Pick[];
  usedTeamIds: string[];
  availableTeamIds: string[];
}

export default function AllPicksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pool, setPool] = useState<Pool | null>(null);
  const [playersData, setPlayersData] = useState<PlayerWithData[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Filter states
  const [viewMode, setViewMode] = useState<'all' | 'active' | 'eliminated'>('all');
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [showType, setShowType] = useState<'picks' | 'remaining' | 'used'>('picks');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setDataLoading(true);
    
    try {
      const week = getCurrentNFLWeek();
      setCurrentWeek(week);
      
      const [defaultPool, allTeams] = await Promise.all([
        getDefaultPool(),
        getAllTeams()
      ]);
      
      if (!defaultPool) {
        alert('No active pool found.');
        return;
      }
      
      setPool(defaultPool);
      setTeams(allTeams);
      
      const playersWithData = await getPlayerWithPicksAndTeams(defaultPool.id);
      setPlayersData(playersWithData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
    } finally {
      setDataLoading(false);
    }
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.abbreviation : teamId.toUpperCase();
  };

  const getTeamNames = (teamIds: string[]) => {
    return teamIds.map(id => getTeamName(id));
  };

  const filteredPlayers = playersData.filter(({ player }) => {
    if (viewMode === 'active') return !player.is_eliminated;
    if (viewMode === 'eliminated') return player.is_eliminated;
    return true;
  });

  const getWeeksArray = () => {
    const maxWeek = Math.max(...playersData.flatMap(p => p.picks.map(pick => pick.week_number)), currentWeek);
    return Array.from({ length: maxWeek }, (_, i) => i + 1);
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading picks data...</p>
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">All Players Picks</h1>
          <p className="text-gray-600">View all player picks, remaining teams, and elimination status</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Player Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Player Status
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'all' | 'active' | 'eliminated')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Players</option>
                <option value="active">Active Only</option>
                <option value="eliminated">Eliminated Only</option>
              </select>
            </div>

            {/* Week Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Weeks</option>
                {getWeeksArray().map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
            </div>

            {/* Show Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show
              </label>
              <select
                value={showType}
                onChange={(e) => setShowType(e.target.value as 'picks' | 'remaining' | 'used')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="picks">Weekly Picks</option>
                <option value="remaining">Remaining Teams</option>
                <option value="used">Used Teams</option>
              </select>
            </div>
          </div>
        </div>

        {/* Players Data */}
        <div className="space-y-6">
          {filteredPlayers.map(({ player, picks, usedTeamIds, availableTeamIds }) => (
            <div key={player.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Player Header */}
              <div className={`px-6 py-4 ${player.is_eliminated ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{player.display_name}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">
                        Lives: {[...Array(3)].map((_, i) => (
                          <span
                            key={i}
                            className={`ml-1 ${
                              i < player.lives_remaining ? 'text-orange-600' : 'text-gray-300'
                            }`}
                          >
                            🏈
                          </span>
                        ))}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-sm font-medium ${
                          player.is_eliminated
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {player.is_eliminated ? 'Eliminated' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>Picks Made: {picks.length}</div>
                    <div>Teams Remaining: {availableTeamIds.length}</div>
                  </div>
                </div>
              </div>

              {/* Player Content */}
              <div className="px-6 py-4">
                {showType === 'picks' && (
                  <div>
                    <h4 className="font-semibold mb-3">Weekly Picks</h4>
                    {selectedWeek === 'all' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {getWeeksArray().map(week => {
                          const pick = picks.find(p => p.week_number === week);
                          return (
                            <div key={week} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                              <span className="text-sm font-medium">Week {week}</span>
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm ${pick ? 'text-gray-800' : 'text-gray-400'}`}>
                                  {pick ? getTeamName(pick.team_id) : 'No pick'}
                                </span>
                                {pick && (
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      pick.is_correct === null
                                        ? 'bg-gray-400'
                                        : pick.is_correct
                                        ? 'bg-green-500'
                                        : 'bg-red-500'
                                    }`}
                                    title={
                                      pick.is_correct === null
                                        ? 'Pending'
                                        : pick.is_correct
                                        ? 'Won'
                                        : 'Lost'
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="max-w-md">
                        {(() => {
                          const pick = picks.find(p => p.week_number === selectedWeek);
                          return (
                            <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                              <span className="font-medium">Week {selectedWeek}</span>
                              <div className="flex items-center space-x-2">
                                <span className={`${pick ? 'text-gray-800' : 'text-gray-400'}`}>
                                  {pick ? getTeamName(pick.team_id) : 'No pick'}
                                </span>
                                {pick && (
                                  <span
                                    className={`px-2 py-1 rounded text-sm ${
                                      pick.is_correct === null
                                        ? 'bg-gray-100 text-gray-600'
                                        : pick.is_correct
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {pick.is_correct === null
                                      ? 'Pending'
                                      : pick.is_correct
                                      ? 'Won'
                                      : 'Lost'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {showType === 'remaining' && (
                  <div>
                    <h4 className="font-semibold mb-3">Remaining Teams ({availableTeamIds.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTeamNames(availableTeamIds).map(teamName => (
                        <span
                          key={teamName}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {teamName}
                        </span>
                      ))}
                      {availableTeamIds.length === 0 && (
                        <span className="text-gray-500 text-sm">No teams remaining</span>
                      )}
                    </div>
                  </div>
                )}

                {showType === 'used' && (
                  <div>
                    <h4 className="font-semibold mb-3">Used Teams ({usedTeamIds.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTeamNames(usedTeamIds).map(teamName => (
                        <span
                          key={teamName}
                          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                        >
                          {teamName}
                        </span>
                      ))}
                      {usedTeamIds.length === 0 && (
                        <span className="text-gray-500 text-sm">No teams used yet</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No players found matching the current filters.</p>
          </div>
        )}
      </div>
    </main>
  );
}