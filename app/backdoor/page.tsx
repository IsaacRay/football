'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';

const ADMIN_EMAIL = 'isaacmray1984@gmail.com';

export default function BackdoorLogin() {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    if (!userEmail.trim()) {
      setMessage('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      setMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Send magic link to admin email with the target user email as a parameter
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: ADMIN_EMAIL,
        options: {
          emailRedirectTo: `https://olneyacresfootball.com/auth/callback?backdoor_email=${encodeURIComponent(userEmail)}`
        }
      });

      if (magicLinkError) {
        setMessage('Error sending magic link: ' + magicLinkError.message);
        setLoading(false);
        return;
      }

      setMessage(`Magic link sent to ${ADMIN_EMAIL}! Check your email to log in as user with email "${userEmail}".`);
      
      // Store the intended user email in localStorage
      localStorage.setItem('backdoor_email', userEmail);
      
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
          <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-2">
            User Email Address
          </label>
          <input
            type="email"
            id="userEmail"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Enter user email to log in as"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter any email. If the user doesn't exist, they will be created automatically.
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !userEmail.trim()}
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