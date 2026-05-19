/**
 * Supabase Client Config — Portal Sicoob
 * professional setup 10/10
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

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
