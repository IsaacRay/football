'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '../utils/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        console.log('AuthContext: Initializing auth...');
        
        // Set timeout to prevent infinite loading
        const timeout = setTimeout(() => {
          console.log('AuthContext: Auth timeout - setting loading to false');
          if (isMounted) {
            setLoading(false);
          }
        }, 5000);

        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthContext: Session retrieved:', { session: !!session, error });

        clearTimeout(timeout);

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('AuthContext: Auth error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', { event, session });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthContext: User signed in, skipping profile creation');
          // Skip profile creation for now since we don't have a profiles table
          // await createUserProfile(session.user);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const createUserProfile = async (user: User) => {
    try {
      // First check if profile already exists
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
          });

        if (insertError) {
          // Handle profile creation error silently
        }
      } else if (error) {
        // Handle profile check error silently
      }
    } catch (error) {
      // Handle unexpected error silently
    }
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signInWithMagicLink,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}