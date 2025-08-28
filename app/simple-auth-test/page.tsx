'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';

export default function SimpleAuthTest() {
  const [status, setStatus] = useState('Starting...');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    
    const testAuth = async () => {
      try {
        setStatus('Creating Supabase client...');
        const supabase = createClient();
        
        setStatus('Getting session (5s timeout)...');
        
        // Race between getSession and timeout
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ timedOut: true }), 5000);
        });
        
        const sessionPromise = supabase.auth.getSession();
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (mounted) {
          if ('timedOut' in result) {
            setStatus('❌ TIMEOUT: getSession took longer than 5 seconds');
            return;
          }
          
          const { data: { session }, error } = result as any;
          
          if (error) {
            setStatus(`❌ Session Error: ${error.message}`);
            return;
          }
          
          if (session?.user) {
            setStatus('✅ User is authenticated!');
            setUser(session.user);
          } else {
            setStatus('⚪ No active session - user needs to login');
          }
        }
        
      } catch (err) {
        if (mounted) {
          setStatus(`❌ Unexpected error: ${err}`);
        }
      }
    };
    
    testAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple Auth Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold">Status:</h2>
          <p className="text-lg">{status}</p>
        </div>
        
        {user && (
          <div className="p-4 bg-green-50 rounded-lg">
            <h2 className="font-semibold text-green-800">User Info:</h2>
            <div className="text-green-700 text-sm space-y-1">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}
        
        <div className="space-x-4">
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Main App
          </a>
          
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go to Login
          </a>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg text-sm">
          <h3 className="font-semibold mb-2">What this test does:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Tests the Supabase client creation</li>
            <li>Tests getSession() with a 5-second timeout</li>
            <li>Shows exactly where the auth process is getting stuck</li>
            <li>Bypasses the complex AuthContext completely</li>
          </ul>
        </div>
      </div>
    </div>
  );
}