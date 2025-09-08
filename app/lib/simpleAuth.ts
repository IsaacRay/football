import { cookies } from 'next/headers';
import { createClient } from '../utils/supabase/server';

export interface User {
  email: string;
}

export async function getUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const email = cookieStore.get('user-email')?.value;
  
  if (!email) return null;
  
  return { email };
}

export async function setUser(email: string) {
  const cookieStore = await cookies();
  
  cookieStore.set('user-email', email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/'
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('user-email');
}

export function isAdmin(email: string | null): boolean {
  return email === 'isaacmray1984@gmail.com';
}

// Simple token storage for magic links - just random strings
export async function createMagicLinkToken(email: string): Promise<string> {
  // Generate a random token - just random characters
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('magic_link_tokens')
    .insert({
      id: token,
      email,
      expires_at: expiresAt.toISOString(),
      used: false
    });
  
  if (error) {
    console.error('Failed to create token:', error);
    throw error;
  }
  
  return token;
}

export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('magic_link_tokens')
    .select('*')
    .eq('id', token)
    .eq('used', false)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return null;
  }
  
  // Mark as used
  await supabase
    .from('magic_link_tokens')
    .update({ used: true })
    .eq('id', token);
  
  return data.email;
}