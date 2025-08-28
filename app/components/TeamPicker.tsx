'use client';

import { useState, useEffect } from 'react';
import { getAvailableTeams, getExistingPick, canEditPicks, updatePick } from '../lib/supabaseQueries';
import type { Player, Pick, Team } from '../lib/supabaseQueries';

interface TeamPickerProps {
  player: Player;
  weekNumber: number;
  onPickSubmit: (pick: Omit<Pick, 'id' | 'created_at' | 'updated_at'>) => void;
  onPickUpdate?: () => void;
}

export default function TeamPicker({ player, weekNumber, onPickSubmit, onPickUpdate }: TeamPickerProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingPick, setExistingPick] = useState<Pick | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teams, existing, editable] = await Promise.all([
          getAvailableTeams(player.id, weekNumber),
          getExistingPick(player.id, weekNumber),
          canEditPicks(weekNumber)
        ]);
        
        setAvailableTeams(teams);
        setExistingPick(existing);
        setCanEdit(editable);
        
        // If there's an existing pick, set it as selected
        if (existing) {
          setSelectedTeam(existing.team_id);
        }
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [player.id, weekNumber]);

  const handleSubmit = async () => {
    if (!selectedTeam) return;
    
    if (existingPick) {
      // Update existing pick
      setUpdating(true);
      try {
        const success = await updatePick(player.id, weekNumber, selectedTeam);
        if (success) {
          onPickUpdate?.();
        }
      } catch (error) {
        // Handle error silently
      } finally {
        setUpdating(false);
      }
    } else {
      // Create new pick
      const pick = {
        player_id: player.id,
        pool_id: player.pool_id,
        week_number: weekNumber,
        team_id: selectedTeam,
        is_correct: null,
      };
      onPickSubmit(pick);
    }
  };

  if (player.is_eliminated) {
    return (
      <div className="bg-red-50 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">You have been eliminated from the pool.</p>
        <p className="text-red-600 text-sm mt-2">Better luck next season!</p>
      </div>
    );
  }

  // Show locked state if picks can't be edited
  if (existingPick && !canEdit) {
    const getTeamName = () => {
      const team = availableTeams.find(t => t.id === existingPick.team_id);
      return team ? `${team.name} (${team.abbreviation})` : existingPick.team_id.toUpperCase();
    };

    return (
      <div className="bg-gray-50 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Week {weekNumber} Pick (Locked)</h3>
        <div className="mb-4">
          <p className="text-gray-600 mb-2">Lives Remaining: {player.lives_remaining}</p>
          <div className="flex space-x-1">
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                className={`text-2xl ${
                  i < player.lives_remaining ? 'text-orange-600' : 'text-gray-300'
                }`}
              >
                🏈
              </span>
            ))}
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">Your pick: {getTeamName()}</p>
          <p className="text-blue-600 text-sm mt-1">
            Picks are locked once the first game of the week starts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">
        {existingPick ? `Edit Your Week ${weekNumber} Pick` : `Make Your Week ${weekNumber} Pick`}
      </h3>
      <div className="mb-4">
        <p className="text-gray-600 mb-2">Lives Remaining: {player.lives_remaining}</p>
        <div className="flex space-x-1">
          {[...Array(3)].map((_, i) => (
            <span
              key={i}
              className={`text-2xl ${
                i < player.lives_remaining ? 'text-orange-600' : 'text-gray-300'
              }`}
            >
              🏈
            </span>
          ))}
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <label className="block text-sm font-medium text-gray-700">Select a team:</label>
        {loading ? (
          <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50">
            Loading teams...
          </div>
        ) : (
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a team...</option>
            {availableTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.abbreviation})
              </option>
            ))}
          </select>
        )}
      </div>

      {existingPick && canEdit && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-sm">
            ⚠️ You can change your pick until the first game starts.
          </p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedTeam || updating}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          selectedTeam && !updating
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {updating ? 'Updating...' : existingPick ? 'Update Pick' : 'Submit Pick'}
      </button>

      <div className="mt-4 text-sm text-gray-600">
        <p>Teams available: {availableTeams.length} / 32</p>
      </div>
    </div>
  );
}