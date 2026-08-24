'use client';

import { useState, useEffect } from 'react';
import {
  getAvailableTeams,
  getAllTeams,
  getExistingPick,
  getWeekKickoffs,
  isPickLocked,
  updatePick,
} from '../lib/supabaseQueries';
import type { Player, Pick, Team } from '../lib/supabaseQueries';
import { DEFAULT_STARTING_LIVES } from '../lib/poolConfig';

interface TeamPickerProps {
  player: Player;
  weekNumber: number;
  startingLives?: number;
  onPickSubmit: (pick: Omit<Pick, 'id' | 'created_at' | 'updated_at'>) => void;
  onPickUpdate?: () => void;
}

// Kickoffs read in Eastern time regardless of where the player is sitting -
// "1:00 PM ET" is how everyone talks about the early Sunday window.
const kickoffFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
});

function formatKickoff(kickoff: Date | undefined): string {
  return kickoff ? `${kickoffFormat.format(kickoff)} ET` : '';
}

export default function TeamPicker({
  player,
  weekNumber,
  startingLives = DEFAULT_STARTING_LIVES,
  onPickSubmit,
  onPickUpdate,
}: TeamPickerProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [kickoffs, setKickoffs] = useState<Map<string, Date>>(new Map());
  const [loading, setLoading] = useState(true);
  const [existingPick, setExistingPick] = useState<Pick | null>(null);
  const [locked, setLocked] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [available, everyTeam, existing, weekKickoffs, pickLocked] = await Promise.all([
          getAvailableTeams(player.id, weekNumber),
          getAllTeams(),
          getExistingPick(player.id, weekNumber),
          getWeekKickoffs(weekNumber),
          isPickLocked(player.id, weekNumber),
        ]);

        setAvailableTeams(available);
        setAllTeams(everyTeam);
        setExistingPick(existing);
        setKickoffs(weekKickoffs);
        setLocked(pickLocked);

        if (existing) {
          setSelectedTeam(existing.team_id);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [player.id, weekNumber]);

  const handleSubmit = async () => {
    if (!selectedTeam) return;
    setError('');

    if (existingPick) {
      setUpdating(true);
      try {
        const result = await updatePick(player.id, weekNumber, selectedTeam);
        if (result.ok) {
          onPickUpdate?.();
        } else {
          setError(result.message ?? 'Failed to update pick.');
        }
      } finally {
        setUpdating(false);
      }
    } else {
      onPickSubmit({
        player_id: player.id,
        pool_id: player.pool_id,
        week_number: weekNumber,
        team_id: selectedTeam,
        is_correct: null,
      });
    }
  };

  const teamLabel = (teamId: string) => {
    const team = allTeams.find((t) => t.id === teamId);
    return team ? `${team.name} (${team.abbreviation})` : teamId.toUpperCase();
  };

  const lives = (
    <div className="mb-4">
      <p className="text-gray-600 mb-2">Lives Remaining: {player.lives_remaining}</p>
      <div className="flex flex-wrap gap-1">
        {[...Array(Math.max(startingLives, player.lives_remaining))].map((_, i) => (
          <span
            key={i}
            className={`text-xl sm:text-2xl ${i < player.lives_remaining ? 'text-orange-600' : 'text-gray-300'}`}
          >
            🏈
          </span>
        ))}
      </div>
    </div>
  );

  if (player.is_eliminated) {
    return (
      <div className="bg-red-50 rounded-lg p-4 sm:p-6 text-center">
        <p className="text-red-800 font-medium">You have been eliminated from the pool.</p>
        <p className="text-red-600 text-sm mt-2">Better luck next season!</p>
      </div>
    );
  }

  // Locked only once THIS pick's game has started - other teams may still be open.
  if (existingPick && locked) {
    return (
      <div className="bg-gray-50 rounded-lg shadow-md p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold mb-4">Week {weekNumber} Pick (Locked)</h3>
        {lives}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">Your pick: {teamLabel(existingPick.team_id)}</p>
          <p className="text-blue-600 text-sm mt-1">
            Locked at kickoff ({formatKickoff(kickoffs.get(existingPick.team_id))}).
          </p>
        </div>
      </div>
    );
  }

  const nothingLeft = !loading && availableTeams.length === 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold mb-4">
        {existingPick ? `Edit Your Week ${weekNumber} Pick` : `Make Your Week ${weekNumber} Pick`}
      </h3>
      {lives}

      <div className="space-y-2 mb-4">
        <label className="block text-sm font-medium text-gray-700">Select a team:</label>
        {loading ? (
          <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50">
            Loading teams...
          </div>
        ) : nothingLeft ? (
          <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
            Every remaining team has already kicked off this week.
          </div>
        ) : (
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a team...</option>
            {availableTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.abbreviation}) - {formatKickoff(kickoffs.get(team.id))}
              </option>
            ))}
          </select>
        )}
      </div>

      {existingPick && !locked && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-sm">
            ⚠️ You can change this pick until {teamLabel(existingPick.team_id)} kicks off
            {kickoffs.get(existingPick.team_id)
              ? ` (${formatKickoff(kickoffs.get(existingPick.team_id))})`
              : ''}
            .
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedTeam || updating || nothingLeft}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          selectedTeam && !updating && !nothingLeft
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {updating ? 'Updating...' : existingPick ? 'Update Pick' : 'Submit Pick'}
      </button>

      <div className="mt-4 text-sm text-gray-600">
        <p>Teams still open: {availableTeams.length}</p>
      </div>
    </div>
  );
}
