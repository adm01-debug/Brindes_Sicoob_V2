/**
 * RLS — e2e_cleanup_rate_limit
 * --------------------------------------------------------------
 * Tabela técnica usada SOMENTE pelo edge `e2e-cleanup` via RPC
 * `e2e_cleanup_check_rate_limit` (SECURITY DEFINER, executável
 * apenas pelo owner / service_role).
 *
 * Cobertura:
 *   - Negativa anon: SELECT/INSERT/UPDATE/DELETE devem falhar
 *     ou retornar 0 linhas (RLS "deny all").
 *   - Acesso esperado é via service_role no edge — não é testado
 *     aqui (já é coberto por `tests/p0/edge-functions-failing.test.ts`).
 */
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { validateE2ETarget } from '../../scripts/e2e-target.mjs';

const URL = process.env.E2E_SUPABASE_URL;
const ANON = process.env.E2E_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_ID = process.env.E2E_SUPABASE_PROJECT_ID;
const ALLOWED_PROJECT_ID = process.env.E2E_ALLOWED_PROJECT_ID;

const requested = process.env.RUN_REMOTE_RLS_TESTS === '1';
if (requested) {
  validateE2ETarget({
    url: URL,
    projectId: PROJECT_ID,
    allowedProjectId: ALLOWED_PROJECT_ID,
    publishableKey: ANON,
    serviceRoleKey: SERVICE_KEY,
  });
}
const enabled = requested && Boolean(URL && ANON && SERVICE_KEY);
const d = enabled ? describe : describe.skip;

type PostgrestResult = {
  error: { code?: string; message?: string } | null;
};

function isTransientPostgrestError(error: PostgrestResult['error']): boolean {
  return error?.code === 'PGRST002' || /gateway timeout/i.test(error?.message ?? '');
}

async function retryTransientPostgrest<T extends PostgrestResult>(
  operation: () => Promise<T>,
): Promise<T> {
  let result = await operation();
  for (let attempt = 1; isTransientPostgrestError(result.error) && attempt < 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    result = await operation();
  }
  return result;
}

d('RLS — e2e_cleanup_rate_limit (deny anon)', () => {
  const anon = enabled ? createClient(URL!, ANON!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'rls-cleanup-anon',
    },
  }) : (null as never);
  const admin = enabled ? createClient(URL!, SERVICE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'rls-cleanup-admin',
    },
  }) : (null as never);
  const canaryKey = `rls-e2e-${crypto.randomUUID()}`;
  beforeAll(async () => {
    const { error } = await retryTransientPostgrest(async () => await admin
      .from('e2e_cleanup_rate_limit')
      .insert({ key: canaryKey, count: 1 }));
    expect(error, 'O projeto E2E de QA deve permitir a fixture controlada de RLS.').toBeNull();
  }, 45_000);

  afterAll(async () => {
    const { error } = await retryTransientPostgrest(async () => await admin
      .from('e2e_cleanup_rate_limit')
      .delete()
      .eq('key', canaryKey));
    expect(error, 'O cleanup deve remover a fixture temporária de RLS do projeto de QA.').toBeNull();
  }, 45_000);

  it('SELECT como anon retorna zero linhas (policy deny_all)', async () => {
    const { data, error } = await retryTransientPostgrest(async () => await anon
      .from('e2e_cleanup_rate_limit')
      .select('key')
      .limit(1));
    // Ou erro de RLS, ou data vazio — nunca leak de linhas.
    expect(error !== null || (Array.isArray(data) && data.length === 0)).toBe(true);
  }, 45_000);

  it('INSERT como anon falha (policy deny_all WITH CHECK false)', async () => {
    const { error } = await anon
      .from('e2e_cleanup_rate_limit')
      .insert({ key: `test-${Date.now()}`, count: 1 });
    expect(error).toBeTruthy();
  }, 15_000);

  it('UPDATE como anon falha (policy deny_all USING false)', async () => {
    const { data } = await anon
      .from('e2e_cleanup_rate_limit')
      .update({ count: 999 })
      .eq('key', canaryKey)
      .select('key,count');
    expect(data ?? []).toHaveLength(0);

    const { data: canary, error: verifyError } = await retryTransientPostgrest(async () => await admin
      .from('e2e_cleanup_rate_limit')
      .select('count')
      .eq('key', canaryKey)
      .single());
    expect(verifyError).toBeNull();
    expect(canary?.count).toBe(1);
  }, 15_000);

  it('DELETE como anon falha (policy deny_all USING false)', async () => {
    const { data } = await anon
      .from('e2e_cleanup_rate_limit')
      .delete()
      .eq('key', canaryKey)
      .select('key');
    expect(data ?? []).toHaveLength(0);

    const { count, error: verifyError } = await retryTransientPostgrest(async () => await admin
      .from('e2e_cleanup_rate_limit')
      .select('key', { count: 'exact', head: true })
      .eq('key', canaryKey));
    expect(verifyError).toBeNull();
    expect(count).toBe(1);
  }, 15_000);
});
