'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_EMAIL = 'isaacmray1984@gmail.com';

export default function BackdoorLogin() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    if (!displayName.trim()) {
      setMessage('Please enter a display name');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // First, send magic link to admin email
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: ADMIN_EMAIL,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?backdoor=${encodeURIComponent(displayName)}`
        }
      });

      if (magicLinkError) {
        setMessage('Error sending magic link: ' + magicLinkError.message);
        setLoading(false);
        return;
      }

      // Check if player exists
      const { data: pool } = await supabase
        .from('pools')
        .select('id, starting_lives')
        .eq('name', 'Main Pool')
        .single();

      if (!pool) {
        setMessage('Pool not found');
        setLoading(false);
        return;
      }

      // Check if player with this name exists
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('pool_id', pool.id)
        .eq('display_name', displayName)
        .single();

      if (!existingPlayer) {
        // Create new player
        const userId = uuidv4();
        const { error: playerError } = await supabase
          .from('players')
          .insert({
            pool_id: pool.id,
            user_id: userId,
            display_name: displayName,
            lives_remaining: pool.starting_lives || 3,
            is_eliminated: false
          });

        if (playerError) {
          setMessage('Error creating player: ' + playerError.message);
          setLoading(false);
          return;
        }
      }

      setMessage(`Magic link sent to ${ADMIN_EMAIL}! Check your email to log in as "${displayName}".`);
      
      // Store the intended player name in localStorage
      localStorage.setItem('backdoor_player', displayName);
      
    } catch (error) {
      setMessage('An error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Backdoor Login</h1>
        
        <div className="mb-4">
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
            Player Display Name
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter player name to log in as"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter any name. If the player doesn't exist, they will be created.
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !displayName.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Sending magic link...' : 'Send Magic Link to Admin Email'}
        </button>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/login" className="text-blue-600 hover:underline text-sm">
            Back to regular login
          </a>
        </div>
      </div>
    </div>
  );
}