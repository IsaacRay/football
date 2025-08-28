'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

export default function DebugPage() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      runDiagnostics();
    }
  }, [user]);

  const runDiagnostics = async () => {
    const info: any = {
      user: null,
      tables: {},
      data: {},
      errors: []
    };

    try {
      // Check user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      info.user = currentUser;

      // Check tables and data
      const checks = [
        { name: 'teams', query: supabase.from('teams').select('count', { count: 'exact' }) },
        { name: 'pools', query: supabase.from('pools').select('count', { count: 'exact' }) },
        { name: 'active_pools', query: supabase.from('pools').select('count', { count: 'exact' }).eq('is_active', true) },
        { name: 'games', query: supabase.from('games').select('count', { count: 'exact' }) },
        { name: 'players', query: supabase.from('players').select('count', { count: 'exact' }) }
      ];

      for (const check of checks) {
        try {
          const { data, error, count } = await check.query;
          if (error) {
            info.errors.push(`${check.name}: ${error.message}`);
          } else {
            info.tables[check.name] = { count, exists: true };
          }
        } catch (err) {
          info.tables[check.name] = { exists: false, error: err };
          info.errors.push(`${check.name}: Table check failed`);
        }
      }

      // Try to get specific data
      try {
        const { data: pools, error: poolError } = await supabase
          .from('pools')
          .select('*')
          .eq('is_active', true);
        
        info.data.pools = pools;
        if (poolError) info.errors.push(`Pool fetch: ${poolError.message}`);
      } catch (err) {
        info.errors.push(`Pool fetch failed: ${err}`);
      }

      try {
        const { data: games, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('week_number', 1)
          .eq('season', 2025)
          .limit(5);
        
        info.data.games = games;
        if (gameError) info.errors.push(`Games fetch: ${gameError.message}`);
      } catch (err) {
        info.errors.push(`Games fetch failed: ${err}`);
      }

    } catch (error) {
      info.errors.push(`Main error: ${error}`);
    }

    setDebugInfo(info);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Diagnostics</h1>
        <p>Running diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Database Diagnostics</h1>
      
      {/* User Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">User Authentication</h2>
        <pre className="text-sm overflow-x-auto">
          {JSON.stringify(debugInfo.user, null, 2)}
        </pre>
      </div>

      {/* Tables Status */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Database Tables</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(debugInfo.tables || {}).map(([table, info]: [string, any]) => (
            <div key={table} className="p-2 bg-white rounded border">
              <strong>{table}</strong>: {info.exists ? `${info.count} rows` : 'Missing/Error'}
              {info.error && <div className="text-red-600 text-sm">{String(info.error)}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Data Samples */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Sample Data</h2>
        
        <div className="mb-4">
          <h3 className="font-medium">Active Pools:</h3>
          <pre className="text-xs overflow-x-auto bg-white p-2 rounded mt-1">
            {JSON.stringify(debugInfo.data?.pools, null, 2)}
          </pre>
        </div>

        <div className="mb-4">
          <h3 className="font-medium">Week 1 Games (sample):</h3>
          <pre className="text-xs overflow-x-auto bg-white p-2 rounded mt-1">
            {JSON.stringify(debugInfo.data?.games, null, 2)}
          </pre>
        </div>
      </div>

      {/* Errors */}
      {debugInfo.errors && debugInfo.errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-red-800">Errors</h2>
          <ul className="list-disc pl-5">
            {debugInfo.errors.map((error: string, index: number) => (
              <li key={index} className="text-red-700">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Recommendations</h2>
        <div className="space-y-2 text-sm">
          {debugInfo.tables?.teams?.count === 0 && (
            <p>• Run the main schema SQL to populate teams</p>
          )}
          {debugInfo.tables?.active_pools?.count === 0 && (
            <p>• Run setup_default_pool.sql to create a default pool</p>
          )}
          {debugInfo.tables?.games?.count === 0 && (
            <p>• Run the schedule SQL files to populate games</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={runDiagnostics}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Re-run Diagnostics
        </button>
      </div>
    </div>
  );
}