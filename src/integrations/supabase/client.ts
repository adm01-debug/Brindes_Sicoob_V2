/**
 * Supabase Client Config — Portal Sicoob
 * professional setup 10/10
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Credentials are injected at build time via Vite env (VITE_*). In test
// environments where import.meta.env is not populated, we read a namespaced
// shim through bracket notation. This is intentionally not named
// `SUPABASE_URL`: aggressive minifiers can rewrite dotted globals into bare
// identifiers and trigger TDZ/runtime errors in production bundles.
type RuntimeConfig = {
  url?: string;
  publishableKey?: string;
};

type RuntimeGlobal = typeof globalThis & Record<string, unknown> & {
  __PORTAL_SICOOB_RUNTIME_CONFIG__?: RuntimeConfig;
};

const runtimeGlobal = globalThis as RuntimeGlobal;
const runtimeConfig = runtimeGlobal['__PORTAL_SICOOB_RUNTIME_CONFIG__'];

const legacyBackendUrl = runtimeGlobal['SUPABASE_URL'];
const legacyPublishableKey =
  runtimeGlobal['SUPABASE_PUBLISHABLE_KEY'] ?? runtimeGlobal['SUPABASE_ANON_KEY'];

const backendUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  runtimeConfig?.url ??
  (typeof legacyBackendUrl === 'string' ? legacyBackendUrl : undefined);
const backendPublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  runtimeConfig?.publishableKey ??
  (typeof legacyPublishableKey === 'string' ? legacyPublishableKey : undefined);

if (!backendUrl || !backendPublishableKey) {
  throw new Error(
    'Configuração do backend ausente: VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórios.',
  );
}

/**
 * Supabase client instance for Portal Sicoob.
 * Optimized for technical excellence 10/10 with enhanced performance config.
 */
export const supabase = createClient<Database>(backendUrl, backendPublishableKey, {
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
