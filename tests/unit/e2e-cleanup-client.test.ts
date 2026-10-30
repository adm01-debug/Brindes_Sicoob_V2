import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCleanupConfig, purgeAll, purgeAllE2eTestData } from '../../e2e/helpers/cleanup-client';
import { e2eScope, isE2eName } from '../../e2e/fixtures/test-user';

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
  it('mantém nomes E2E sob o prefixo literal e reconhece o formato legado', () => {
    expect(e2eScope('t-0123456789abcdef')).toBe('[E2E] t-0123456789abcdef');
    expect(isE2eName('[E2E] t-0123456789abcdef orçamento')).toBe(true);
    expect(isE2eName('[E2E:legacy-spec] orçamento')).toBe(true);
    expect(isE2eName('[E2Evil] dado manual')).toBe(false);
  });

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
      expect(JSON.parse(String(init?.body)).nameFilterPrefix).toBe('[E2E]');
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

  it('limpa prefixo customizado, prefixo atual e formato legado sem usar padrão amplo', async () => {
    const cfg = configurePersonas();
    cfg.nameFilterPrefix = '[E2E] rodada-42';
    const fetchMock = vi.fn().mockImplementation(async () => successfulCleanup());
    vi.stubGlobal('fetch', fetchMock);

    await purgeAllE2eTestData(cfg, {
      retryPolicy: { attempts: 1, baseDelayMs: 1, maxDelayMs: 1, requestTimeoutMs: 100 },
    });

    const prefixes = [...new Set(fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).nameFilterPrefix))];
    expect(prefixes).toEqual(['[E2E] rodada-42', '[E2E]', '[E2E:']);
    expect(fetchMock).toHaveBeenCalledTimes(15);
  });

  it('recusa prefixo de cleanup amplo ou fora do namespace E2E', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://staging-project.supabase.co');
    vi.stubEnv('E2E_CLEANUP_TOKEN', 'test-cleanup-token');
    vi.stubEnv('E2E_USER_EMAIL', 'user@example.test');
    vi.stubEnv('E2E_TEST_PREFIX', '%');

    expect(() => loadCleanupConfig()).toThrow('E2E_TEST_PREFIX deve ser um prefixo específico');
  });
});
