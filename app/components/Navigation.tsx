'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  
  const isAdmin = user?.email === 'isaacmray1984@gmail.com';

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      // Handle error silently
    }
  };

  return (
    <div className="bg-blue-600 text-white py-6 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
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
        
        {user && (
          <nav className="flex space-x-6">
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                pathname === '/' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              href="/all-picks"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                pathname === '/all-picks'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              All Picks
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  pathname === '/admin'
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}