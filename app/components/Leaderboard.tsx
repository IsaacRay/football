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
    footballs.push(
      <span key={i} className="text-lg sm:text-2xl text-orange-600 leading-none">
        🏈
      </span>
    );
  }
  // Wraps rather than forcing the column wider once someone has 4+ lives.
  return <div className="flex flex-wrap justify-center gap-0.5">{footballs}</div>;
}

export default function Leaderboard({ players }: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.is_eliminated && !b.is_eliminated) return 1;
    if (!a.is_eliminated && b.is_eliminated) return -1;
    return b.lives_remaining - a.lives_remaining;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm sm:text-base">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-1 sm:px-3">#</th>
              <th className="text-left py-2 px-1 sm:px-3">Player</th>
              <th className="text-center py-2 px-1 sm:px-3">Lives</th>
              <th className="text-center py-2 px-3 hidden sm:table-cell">Picks</th>
              <th className="text-center py-2 px-1 sm:px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, index) => (
              <tr key={player.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-1 sm:px-3 font-medium">{index + 1}</td>
                <td className="py-3 px-1 sm:px-3">
                  <div>
                    <div className="font-medium">{player.display_name}</div>
                  </div>
                </td>
                <td className="py-3 px-1 sm:px-3 text-center">
                  <LivesDisplay lives={player.lives_remaining} />
                </td>
                <td className="py-3 px-3 text-center hidden sm:table-cell">{player.pick_count}</td>
                <td className="py-3 px-1 sm:px-3 text-center">
                  <span
                    className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
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