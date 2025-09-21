'use client';

import { useState, useEffect } from 'react';
import { getAllTeams } from '../lib/supabaseQueries';
import type { Game, Team } from '../lib/supabaseQueries';

interface WeeklyScheduleProps {
  games: Game[];
  weekNumber: number;
}

export default function WeeklySchedule({ games, weekNumber }: WeeklyScheduleProps) {
  const [teams, setTeams] = useState<Team[]>([]);

  console.log('WeeklySchedule received:', games.length, 'games for week', weekNumber);
  console.log('Game details:', games.map(g => ({ 
    week: g.week_number, 
    away: g.away_team, 
    home: g.home_team 
  })));

  useEffect(() => {
    const loadTeams = async () => {
      const allTeams = await getAllTeams();
      setTeams(allTeams);
    };
    loadTeams();
  }, []);

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.abbreviation || teamId.toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">Week {weekNumber} Schedule</h3>
      <div className="space-y-3">
        {games.map(game => (
          <div
            key={game.id}
            className={`border rounded-lg p-4 ${
              game.is_complete ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-medium ${
                      game.winner === game.away_team ? 'text-green-600' : ''
                    }`}
                  >
                    {getTeamName(game.away_team)}
                  </span>
                  {game.is_complete && game.away_score !== null && (
                    <span className="text-gray-600">{game.away_score}</span>
                  )}
                </div>
                <div className="text-gray-500 text-sm">@</div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-medium ${
                      game.winner === game.home_team ? 'text-green-600' : ''
                    }`}
                  >
                    {getTeamName(game.home_team)}
                  </span>
                  {game.is_complete && game.home_score !== null && (
                    <span className="text-gray-600">{game.home_score}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {game.is_complete ? (
                  <span className="text-sm text-gray-500">Final</span>
                ) : (
                  <span className="text-sm text-gray-600">
                    {new Date(game.game_time).toLocaleDateString('en-US', {
                      weekday: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}