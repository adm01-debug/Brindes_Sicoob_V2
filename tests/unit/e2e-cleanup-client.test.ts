import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCleanupConfig, purgeAll } from '../../e2e/helpers/cleanup-client';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configurePersonas() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://staging-project.supabase.co');
  vi.stubEnv('E2E_CLEANUP_TOKEN', 'test-cleanup-token');
  vi.stubEnv('E2E_USER_EMAIL', 'user@example.test');
  vi.stubEnv('E2E_VIEWER_EMAIL', 'viewer@example.test');
  vi.stubEnv('E2E_MANAGER_EMAIL', 'manager@example.test');
  vi.stubEnv('E2E_ADMIN_EMAIL', 'admin@example.test');
  vi.stubEnv('E2E_DEV_EMAIL', 'dev@example.test');
  return loadCleanupConfig()!;
}

function successfulCleanup() {
  return new Response(JSON.stringify({ ok: true, dryRun: false, deleted: {} }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('limpeza E2E de homologação', () => {
  it('purga cada persona configurada exatamente uma vez', async () => {
    const cfg = configurePersonas();
    const fetchMock = vi.fn().mockImplementation(async () => successfulCleanup());
    vi.stubGlobal('fetch', fetchMock);

    await purgeAll(cfg, { retryPolicy: { attempts: 1, baseDelayMs: 1, maxDelayMs: 1, requestTimeoutMs: 100 } });

    const emails = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).email);
    expect(emails).toEqual([
      'user@example.test',
      'admin@example.test',
      'viewer@example.test',
      'manager@example.test',
      'dev@example.test',
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(JSON.parse(String(init?.body)).nameFilterPrefix).toBe('[E2E');
    }
  });

  it('falha a purga se qualquer persona for recusada pelo cleanup', async () => {
    const cfg = configurePersonas();
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => successfulCleanup())
      .mockImplementationOnce(async () => new Response(JSON.stringify({ ok: false, error: 'email_not_in_allow_list' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockImplementation(async () => successfulCleanup());
    vi.stubGlobal('fetch', fetchMock);

    await expect(purgeAll(cfg, {
      retryPolicy: { attempts: 1, baseDelayMs: 1, maxDelayMs: 1, requestTimeoutMs: 100 },
    })).rejects.toThrow('limpeza não confirmada para 1 persona(s)');
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('falha quando a limpeza responde em modo dry-run ou com erros parciais', async () => {
    const cfg = configurePersonas();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      dryRun: true,
      deleted: {},
      errors: { quotes: 'permission denied' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(purgeAll(cfg, {
      retryPolicy: { attempts: 1, baseDelayMs: 1, maxDelayMs: 1, requestTimeoutMs: 100 },
    })).rejects.toThrow('limpeza não confirmada para 5 persona(s)');
  });
});
