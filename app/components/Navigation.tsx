'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      // Handle error silently
    }
  };

  return (
    <div className="bg-blue-600 text-white py-4 sm:py-6 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Olney Acres Football</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-blue-100">NFL Survivor Pool</p>
          </div>
          
          {user && (
            <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0">
              <div className="min-w-0 sm:text-right">
                <p className="text-xs sm:text-sm text-blue-100">Welcome,</p>
                <p className="font-medium text-sm sm:text-base truncate">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shrink-0"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
        
        {user && (
          <nav className="flex gap-2 sm:gap-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap shrink-0 ${
                pathname === '/' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              href="/all-picks"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap shrink-0 ${
                pathname === '/all-picks'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              All Picks
            </Link>
            {user?.isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap shrink-0 ${
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