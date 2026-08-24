import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cookie-free Supabase client for background jobs (cron, scripts).
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY when present so the job doesn't depend on RLS
 * being disabled; falls back to the anon key, which is what the app uses today.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL/key missing from environment');
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ServiceClient = ReturnType<typeof createServiceClient>;
