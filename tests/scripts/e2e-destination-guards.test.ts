import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');

const QA_ENV = {
  E2E_SUPABASE_URL: 'https://qa-sicoob-123.supabase.co',
  E2E_SUPABASE_PROJECT_ID: 'qa-sicoob-123',
  E2E_ALLOWED_PROJECT_ID: 'qa-sicoob-123',
  E2E_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_qa',
  E2E_SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_qa',
  E2E_DEV_EMAIL: 'dev@example.test',
  E2E_DEV_PASSWORD: 'senha-qa',
};
const forbidden = (id: string) => ({
  ...QA_ENV,
  E2E_SUPABASE_URL: `https://${id}.supabase.co`,
  E2E_SUPABASE_PROJECT_ID: id,
  E2E_ALLOWED_PROJECT_ID: id,
});

/** Registra qualquer tentativa de rede num arquivo e responde 500: o teste prova que nada foi enviado. */
function run(script: string, env: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'dest-guard-'));
  const log = join(dir, 'network.log');
  const preload = join(dir, 'spy-fetch.mjs');
  writeFileSync(
    preload,
    `import { appendFileSync } from 'node:fs';
     globalThis.fetch = async (url) => { appendFileSync(${JSON.stringify(log)}, String(url) + '\\n'); return new Response('{}', { status: 500 }); };`,
  );
  const clean: Record<string, string | undefined> = { ...process.env };
  for (const key of Object.keys(clean)) if (key.startsWith('E2E_') || key.startsWith('VITE_SUPABASE') || key.startsWith('SUPABASE_')) delete clean[key];
  const result = spawnSync(process.execPath, ['--import', preload, join(ROOT, script)], { encoding: 'utf8', env: { ...clean, ...env } });
  let network = '';
  try {
    network = readFileSync(log, 'utf8');
  } catch {
    network = '';
  }
  return { ...result, network };
}

const PRODUCTION = 'cfmzkthhgliqelozlmwu';
const PROTECTED = [
  ['produção', PRODUCTION],
  ['catálogo externo', 'doufsxqlfjyuvxuezpln'],
  ['CRM', 'pgxfvjmuubtbowutlide'],
  ['legado nmoj…', 'nmojwpihnslkssljowjh'],
  ['legado boje…', 'bojgeppypmtormfjsyun'],
  ['legado hgbz…', 'hgbzltfwozdkcudofypy'],
] as const;

describe.each([['scripts/test-rls.mjs'], ['scripts/seed-qa.mjs'], ['scripts/e2e-cleanup.mjs']])('%s — guarda de destino', (script) => {
  it.each(PROTECTED)('recusa %s mesmo listado como permitido, sem nenhuma requisição', (_label, id) => {
    const result = run(script, { ...forbidden(id), E2E_CLEANUP_TOKEN: 't', E2E_USER_EMAIL: 'qa@example.test' });
    expect(result.status, result.stderr).not.toBe(0);
    expect(result.network).toBe('');
  });

  it('sem configuração E2E sai 2 e não usa as variáveis de produção do app', () => {
    const result = run(script, {
      VITE_SUPABASE_URL: `https://${PRODUCTION}.supabase.co`,
      SUPABASE_URL: `https://${PRODUCTION}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: 'chave-de-producao',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'anon',
    });
    expect(result.status).toBe(2);
    expect(result.network).toBe('');
  });
});

describe('seed-qa — credenciais do usuário dev', () => {
  it('destino válido mas sem E2E_DEV_EMAIL/PASSWORD sai 2 antes de qualquer requisição', () => {
    const { E2E_DEV_EMAIL: _e, E2E_DEV_PASSWORD: _p, ...withoutDev } = QA_ENV;
    const result = run('scripts/seed-qa.mjs', withoutDev);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('E2E_DEV_EMAIL');
    expect(result.network).toBe('');
  });

  it('destino válido tenta o login no projeto de homologação (e só nele)', () => {
    const result = run('scripts/seed-qa.mjs', QA_ENV);
    expect(result.status).toBe(1);
    expect(result.network).toContain('qa-sicoob-123.supabase.co');
    expect(result.network).not.toContain(PRODUCTION);
  });
});
