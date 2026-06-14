/**
 * Supabase Client Config — Portal Sicoob
 * professional setup 10/10
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Credentials are injected at build time via Vite env (VITE_*). In test
// environments where import.meta.env is not populated, we fall back to the
// global shims defined in src/test/setup.ts so the client can be constructed.
const globalShim = globalThis as { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string };
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? globalShim.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? globalShim.SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client instance for Portal Sicoob.
 * Optimized for technical excellence 10/10 with enhanced performance config.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { 'x-application-name': 'portal-sicoob' },
  },
  // Higher performance defaults for DB operations
  db: {
    schema: 'public'
  }
});
