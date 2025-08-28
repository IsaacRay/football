'use client';

import { useState, useEffect } from 'react';
import { getPicksByPlayer, getAllTeams } from '../lib/supabaseQueries';
import type { Pick, Team } from '../lib/supabaseQueries';

interface PickHistoryProps {
  player: {
    id: string;
    display_name: string;
  };
}

export default function PickHistory({ player }: PickHistoryProps) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [playerPicks, allTeams] = await Promise.all([
          getPicksByPlayer(player.id),
          getAllTeams()
        ]);
        setPicks(playerPicks);
        setTeams(allTeams);
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [player.id]);

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.abbreviation : teamId.toUpperCase();
  };

  if (loading) {
    return (
      <div className="mt-12 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Your Pick History</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Your Pick History</h2>
      <div className="space-y-2">
        {picks.length === 0 ? (
          <p className="text-gray-500">No picks made yet</p>
        ) : (
          picks.map((pick) => (
            <div key={pick.id} className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Week {pick.week_number}</span>
              <span className="font-medium">{getTeamName(pick.team_id)}</span>
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
                  : 'Lost (-1 life)'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}