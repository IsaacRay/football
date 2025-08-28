'use client';

import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      // Handle error silently
    }
  };

  return (
    <div className="bg-blue-600 text-white py-6 shadow-lg">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Olney Acres Football</h1>
          <p className="mt-2 text-blue-100">NFL Survivor Pool • 3 Lives System</p>
        </div>
        
        {user && (
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-blue-100">Welcome,</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}