import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

it('recusa confirmação por UUID sem ler segredos nem acessar rede', async () => {
  let handler: (req: Request) => Response = () => new Response();
  const fetchSpy = vi.fn();
  const envGet = vi.fn();
  vi.stubGlobal('Deno', {
    env: { get: envGet },
    serve: (fn: typeof handler) => { handler = fn; },
  });
  vi.stubGlobal('fetch', fetchSpy);

  await import('../../supabase/functions/verify-email/index');

  const response = handler(new Request('https://exemplo.invalid', {
    method: 'POST',
    body: JSON.stringify({ token: '00000000-0000-0000-0000-000000000001' }),
  }));

  expect(response.status).toBe(410);
  expect((await response.json()).error).toBe('endpoint_desativado');
  expect(envGet).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
});
