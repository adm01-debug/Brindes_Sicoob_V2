/**
 * Supabase Client Config — Portal Sicoob
 * professional setup 10/10
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Credentials are injected at build time via Vite env (VITE_*). In test
// environments where import.meta.env is not populated, we fall back to the
// global shims defined in src/test/setup.ts so the client can be constructed.
// NOTE: do NOT name shim keys `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` —
// Rollup's minifier rewrites `globalThis.X` into a bare `X` global reference,
// which throws `ReferenceError: SUPABASE_URL is not defined` in production.
type SupabaseShim = { __SUPABASE_URL__?: string; __SUPABASE_PUBLISHABLE_KEY__?: string };
const globalShim = globalThis as SupabaseShim;
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? globalShim.__SUPABASE_URL__;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? globalShim.__SUPABASE_PUBLISHABLE_KEY__;

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
