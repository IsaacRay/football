'use client';

import type { Player } from '../lib/supabaseQueries';

interface PlayerWithPickCount extends Player {
  pick_count: number;
}

interface LeaderboardProps {
  players: PlayerWithPickCount[];
}

function LivesDisplay({ lives }: { lives: number }) {
  const footballs = [];
  for (let i = 0; i < lives; i++) {
    footballs.push(<span key={i} className="text-2xl text-orange-600">🏈</span>);
  }
  return <div className="flex justify-center space-x-1">{footballs}</div>;
}

export default function Leaderboard({ players }: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.is_eliminated && !b.is_eliminated) return 1;
    if (!a.is_eliminated && b.is_eliminated) return -1;
    return b.lives_remaining - a.lives_remaining;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-3">Rank</th>
              <th className="text-left py-2 px-3">Player</th>
              <th className="text-center py-2 px-3">Lives</th>
              <th className="text-center py-2 px-3">Picks Made</th>
              <th className="text-center py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, index) => (
              <tr key={player.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-3 font-medium">{index + 1}</td>
                <td className="py-3 px-3">
                  <div>
                    <div className="font-medium">{player.display_name}</div>
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <LivesDisplay lives={player.lives_remaining} />
                </td>
                <td className="py-3 px-3 text-center">{player.pick_count}</td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      player.is_eliminated
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {player.is_eliminated ? 'Eliminated' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}