import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { runHealthcheck } from '../../scripts/healthcheck.mjs';

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('preflight do health-check público', () => {
  it('executa o CLI com .env, sem chave e retorna exit code 0 em liveness válido', async () => {
    let requestMethod = '';
    let requestApiKey: string | undefined;
    const server = createServer((request, response) => {
      requestMethod = request.method ?? '';
      requestApiKey = request.headers.apikey;
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
    });
    await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Servidor local sem porta TCP');
    const directory = await mkdtemp(join(tmpdir(), 'healthcheck-cli-'));
    try {
      await writeFile(join(directory, '.env'), `SUPABASE_URL=http://127.0.0.1:${address.port}\n`);
      const child = spawn(process.execPath, [resolve(process.cwd(), 'scripts/healthcheck.mjs')], {
        cwd: directory,
        env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
      child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk; });
      const exitCode = await new Promise<number | null>((resolveExit, reject) => {
        child.once('error', reject);
        child.once('close', resolveExit);
      });
      expect({ exitCode, stdout, stderr }).toMatchObject({ exitCode: 0 });
      expect(requestMethod).toBe('GET');
      expect(requestApiKey).toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
      await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
    }
  });

  it('usa GET e aceita somente status ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { status: 'ok' }));
    const logger = { log: vi.fn(), error: vi.fn() };
    await expect(runHealthcheck({
      supabaseUrl: 'https://example.supabase.co/', anonKey: 'publishable', fetchImpl, logger,
    })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/health-check',
      expect.objectContaining({
        method: 'GET',
        headers: { apikey: 'publishable' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('consulta liveness sem exigir nem enviar chave', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { status: 'ok' }));
    await expect(runHealthcheck({
      supabaseUrl: 'https://example.supabase.co', anonKey: '', fetchImpl,
      logger: { log: vi.fn(), error: vi.fn() },
    })).resolves.toBe(true);
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({});
  });

  it('aplica timeout de 15 segundos e falha fechado quando o sinal aborta', async () => {
    const controller = new AbortController();
    const makeTimeoutSignal = vi.fn(() => controller.signal);
    const fetchImpl = vi.fn((_url: string, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    const check = runHealthcheck({
      supabaseUrl: 'https://example.supabase.co', fetchImpl, makeTimeoutSignal,
      logger: { log: vi.fn(), error: vi.fn() },
    });
    expect(makeTimeoutSignal).toHaveBeenCalledWith(15_000);
    controller.abort();
    await expect(check).resolves.toBe(false);
  });

  it('aceita os nomes VITE_ documentados no ambiente de implantação', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vite-example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'vite-publishable');
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { status: 'ok' }));
    try {
      await expect(runHealthcheck({ fetchImpl, logger: { log: vi.fn(), error: vi.fn() } })).resolves.toBe(true);
      expect(fetchImpl).toHaveBeenCalledWith(
        'https://vite-example.supabase.co/functions/v1/health-check',
        expect.objectContaining({ headers: { apikey: 'vite-publishable' } }),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each([
    [405, { status: 'healthy' }],
    [503, { status: 'ok' }],
    [200, { status: 'healthy' }],
  ])('falha fechado para resposta HTTP %i ou contrato antigo', async (status, body) => {
    const logger = { log: vi.fn(), error: vi.fn() };
    await expect(runHealthcheck({
      supabaseUrl: 'https://example.supabase.co', anonKey: 'publishable',
      fetchImpl: vi.fn().mockResolvedValue(response(status, body)), logger,
    })).resolves.toBe(false);
  });

  it('falha fechado para credenciais ausentes, JSON inválido e erro de rede', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };
    await expect(runHealthcheck({ supabaseUrl: '', anonKey: 'key', logger })).resolves.toBe(false);
    await expect(runHealthcheck({
      supabaseUrl: 'https://example.supabase.co', anonKey: 'key',
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('JSON inválido'); } }), logger,
    })).resolves.toBe(false);
    await expect(runHealthcheck({
      supabaseUrl: 'https://example.supabase.co', anonKey: 'key',
      fetchImpl: vi.fn().mockRejectedValue(new Error('timeout')), logger,
    })).resolves.toBe(false);
  });
});
