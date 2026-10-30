import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const workflow = parse(readFileSync('.github/workflows/e2e.yml', 'utf8'));
const preflight = workflow.jobs.e2e.steps.find(
  (step: { name?: string }) => step.name === 'Verificar credenciais da jornada autenticada',
)?.run;

if (typeof preflight !== 'string') throw new Error('Preflight do E2E não encontrado no workflow.');

const projectRef = 'abcdefghijabcdefghij';
const validEnvironment = {
  E2E_SUPABASE_PROJECT_ID: projectRef,
  VITE_SUPABASE_PROJECT_ID: projectRef,
  VITE_SUPABASE_URL: `https://${projectRef}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: 'chave-publicavel-ficticia',
  E2E_CLEANUP_TOKEN: 'token-cleanup-ficticio',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-ficticia',
  E2E_USER_EMAIL: 'user@example.test',
  E2E_USER_PASSWORD: 'senha-ficticia',
  E2E_VIEWER_EMAIL: 'viewer@example.test',
  E2E_VIEWER_PASSWORD: 'senha-ficticia',
  E2E_MANAGER_EMAIL: 'manager@example.test',
  E2E_MANAGER_PASSWORD: 'senha-ficticia',
  E2E_ADMIN_EMAIL: 'admin@example.test',
  E2E_ADMIN_PASSWORD: 'senha-ficticia',
  E2E_ADMIN_TOTP_SECRET: 'totp-ficticio',
  E2E_DEV_EMAIL: 'dev@example.test',
  E2E_DEV_PASSWORD: 'senha-ficticia',
  E2E_DEV_TOTP_SECRET: 'totp-ficticio',
};

function runPreflight(overrides: Record<string, string | undefined> = {}) {
  const env = { ...validEnvironment, ...overrides };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete env[key as keyof typeof env];
  }
  return spawnSync('bash', ['-euo', 'pipefail', '-c', preflight], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

describe('preflight do workflow E2E', () => {
  it('permite apenas a configuração completa com URL e ref coincidentes', () => {
    const result = runPreflight();
    expect(result.status).toBe(0);
  });

  it.each([
    ['projeto Sicoob canônico', 'cfmzkthhgliqelozlmwu'],
    ['catálogo de produtos', 'doufsxqlfjyuvxuezpln'],
  ])('bloqueia %s antes de chamadas remotas', (_name, blockedRef) => {
    const result = runPreflight({
      E2E_SUPABASE_PROJECT_ID: blockedRef,
      VITE_SUPABASE_PROJECT_ID: blockedRef,
      VITE_SUPABASE_URL: `https://${blockedRef}.supabase.co`,
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain('banco Sicoob e o catálogo de produtos são bloqueados');
  });

  it.each([
    ['chave publicável', 'VITE_SUPABASE_PUBLISHABLE_KEY'],
    ['service role', 'SUPABASE_SERVICE_ROLE_KEY'],
    ['token de cleanup', 'E2E_CLEANUP_TOKEN'],
  ])('falha fechado quando falta %s', (_name, variable) => {
    const result = runPreflight({ [variable]: undefined });
    expect(result.status).not.toBe(0);
  });
});
