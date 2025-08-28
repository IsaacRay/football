'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';

export default function AuthTest() {
  const [authStatus, setAuthStatus] = useState<string>('Loading...');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testAuth();
  }, []);

  const testAuth = async () => {
    try {
      setAuthStatus('Creating Supabase client...');
      const supabase = createClient();
      
      setAuthStatus('Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setError(`Session error: ${sessionError.message}`);
        setAuthStatus('Failed to get session');
        return;
      }
      
      setAuthStatus('Getting user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        setError(`User error: ${userError.message}`);
        setAuthStatus('Failed to get user');
        return;
      }
      
      if (user) {
        setUser(user);
        setAuthStatus('User authenticated successfully!');
      } else {
        setAuthStatus('No user found - not authenticated');
      }
      
    } catch (err) {
      setError(`Unexpected error: ${err}`);
      setAuthStatus('Authentication test failed');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold">Status:</h2>
          <p>{authStatus}</p>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 rounded-lg">
            <h2 className="font-semibold text-red-800">Error:</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {user && (
          <div className="p-4 bg-green-50 rounded-lg">
            <h2 className="font-semibold text-green-800">User Info:</h2>
            <pre className="text-sm overflow-x-auto text-green-700">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="space-x-4">
          <button
            onClick={testAuth}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Re-test Authentication
          </button>
          
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    </div>
  );
}