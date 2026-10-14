/**
 * Edge Authorization Bypass Tests
 * --------------------------------------------------------------
 * Para cada edge sensível (categoria supervisor/dev no manifest),
 * tenta invocar:
 *   1. SEM Authorization header  → espera 401
 *   2. COM Bearer inválido       → espera 401
 *
 * Não exercita o caso "user authenticated sem role" porque criar
 * users descartáveis no CI é fluxo separado (ver tests/rls/personas).
 *
 * Habilita-se somente com RUN_REMOTE_AUTHZ_TESTS=1. A presença acidental de
 * variáveis VITE_* em um teste unitário não pode disparar dezenas de chamadas
 * contra o ambiente remoto.
 */
import { describe, it, expect } from 'vitest';
import {
  EDGE_AUTHZ_MANIFEST,
} from '../../supabase/functions/_shared/edge-authz-manifest';

const URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const ANON = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const requested = process.env.RUN_REMOTE_AUTHZ_TESTS === '1';
if (requested && (!URL || !ANON)) {
  throw new Error('RUN_REMOTE_AUTHZ_TESTS=1 exige VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
}
const enabled = requested && Boolean(URL && ANON);
const d = enabled ? describe : describe.skip;
const REQUEST_TIMEOUT_MS = 15_000;
const TEST_TIMEOUT_MS = 35_000;

async function invokeSensitiveEdge(name: string, authorization?: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const headers: Record<string, string> = {
        apikey: ANON!,
        'Content-Type': 'application/json',
      };
      if (authorization) headers.Authorization = authorization;
      return await fetch(`${URL}/functions/v1/${name}`, {
        method: 'POST',
        headers,
        body: '{}',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

const SENSITIVE = Object.entries(EDGE_AUTHZ_MANIFEST).filter(
  ([, e]) =>
    (e.category === 'supervisor' || e.category === 'dev') &&
    e.runtime !== 'source-only' &&
    !e.skipAnonBypassTest,
);

d('Edge authz bypass — supervisor/dev sem auth retorna 401', () => {
  for (const [name] of SENSITIVE) {
    it(`${name}: anon sem Authorization → 401`, async () => {
      const res = await invokeSensitiveEdge(name);
      await res.text(); // drena o corpo
      // Edge runtime do Supabase aplica verify_jwt=true por padrão →
      // sem header Authorization retorna 401. Aceitamos também 403
      // para edges que validem por has_role inline antes do parse.
      expect([401, 403]).toContain(res.status);
    }, TEST_TIMEOUT_MS);

    it(`${name}: Bearer inválido → 401`, async () => {
      const res = await invokeSensitiveEdge(name, 'Bearer invalid.jwt.token');
      await res.text();
      expect([401, 403]).toContain(res.status);
    }, TEST_TIMEOUT_MS);
  }
});
