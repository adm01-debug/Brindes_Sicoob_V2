import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = resolve(__dirname, '../../scripts/e2e-cleanup.mjs');

const baseEnv = {
  E2E_SUPABASE_URL: 'https://qa-sicoob-123.supabase.co',
  E2E_SUPABASE_PROJECT_ID: 'qa-sicoob-123',
  E2E_ALLOWED_PROJECT_ID: 'qa-sicoob-123',
  E2E_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_qa',
  E2E_SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_qa',
  E2E_CLEANUP_TOKEN: 'token-qa',
  E2E_USER_EMAIL: 'qa@example.test',
};

/** Roda o CLI com `fetch` substituído por um preload que devolve a resposta pedida e registra a URL. */
function run(response: { status?: number; body: string }, env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'e2e-cleanup-'));
  const preload = join(dir, 'fake-fetch.mjs');
  writeFileSync(
    preload,
    `globalThis.fetch = async (url) => {
       console.error('FETCH_URL=' + String(url));
       return new Response(${JSON.stringify(response.body)}, { status: ${response.status ?? 200} });
     };`,
  );
  return spawnSync(process.execPath, ['--import', preload, SCRIPT, '--no-dry-run'], {
    encoding: 'utf8',
    env: { ...process.env, ...baseEnv, ...env },
  });
}

describe('e2e-cleanup — resultado do backend', () => {
  it('ok:true é sucesso (exit 0)', () => {
    const result = run({ body: JSON.stringify({ ok: true, deleted: { quotes: 2 } }) });
    expect(result.status, result.stderr).toBe(0);
  });

  it('HTTP 200 com ok:false (purge parcial) falha e nomeia as tabelas', () => {
    const result = run({ body: JSON.stringify({ ok: false, errorTables: ['quotes_block', 'orders'] }) });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('quotes_block, orders');
    expect(result.stdout + result.stderr).not.toContain('aceito');
  });

  it.each([
    ['sem o campo ok', JSON.stringify({ deleted: {} })],
    ['ok como string', JSON.stringify({ ok: 'true' })],
    ['corpo que não é JSON', '<html>proxy</html>'],
    ['corpo vazio', ''],
  ])('%s falha (resultado desconhecido não é sucesso)', (_label, body) => {
    expect(run({ body }).status).toBe(1);
  });

  it('HTTP de erro continua falhando', () => {
    expect(run({ status: 403, body: JSON.stringify({ ok: false }) }).status).toBe(1);
  });

  it('URL com barra final não gera // no caminho da função', () => {
    const result = run({ body: JSON.stringify({ ok: true }) }, { E2E_SUPABASE_URL: 'https://qa-sicoob-123.supabase.co/' });
    expect(result.stderr).toContain('FETCH_URL=https://qa-sicoob-123.supabase.co/functions/v1/e2e-cleanup');
    expect(result.stderr).not.toContain('//functions');
    expect(result.status, result.stderr).toBe(0);
  });

  it('projeto de produção é recusado antes de qualquer requisição', () => {
    const result = run(
      { body: JSON.stringify({ ok: true }) },
      {
        E2E_SUPABASE_URL: 'https://cfmzkthhgliqelozlmwu.supabase.co',
        E2E_SUPABASE_PROJECT_ID: 'cfmzkthhgliqelozlmwu',
        E2E_ALLOWED_PROJECT_ID: 'cfmzkthhgliqelozlmwu',
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toContain('FETCH_URL');
  });
});
