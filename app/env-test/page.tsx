'use client';

export default function EnvTest() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Environment Variables Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h2 className="font-semibold">NEXT_PUBLIC_SUPABASE_URL:</h2>
          <p className="text-sm font-mono break-all">
            {supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Status: {supabaseUrl ? '✅ Available' : '❌ Missing'}
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <h2 className="font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY:</h2>
          <p className="text-sm font-mono break-all">
            {supabaseKey ? `${supabaseKey.substring(0, 30)}...` : 'NOT SET'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Status: {supabaseKey ? '✅ Available' : '❌ Missing'}
          </p>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold">Diagnosis:</h2>
          {supabaseUrl && supabaseKey ? (
            <p className="text-green-700">✅ Environment variables are properly configured</p>
          ) : (
            <div className="text-red-700">
              <p>❌ Environment variables are missing</p>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Make sure .env.local exists in your project root</li>
                <li>Variables must start with NEXT_PUBLIC_ to be available in the browser</li>
                <li>Restart your development server after adding env vars</li>
                <li>For production, make sure to set these in your hosting platform</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}