import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { DripConfigError } from './errors';

/**
 * Server-only Supabase client with the service role key. Required for the
 * background worker, which runs without any logged-in browser session.
 */
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new DripConfigError(
      'Brak SUPABASE_SERVICE_ROLE_KEY w zmiennych środowiskowych serwera (Vercel -> Settings -> Environment Variables).'
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getUserFromRequest(request: Request, admin: SupabaseClient): Promise<User | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
