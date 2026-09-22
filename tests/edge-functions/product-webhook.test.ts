import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => vi.unstubAllGlobals());
it('endpoint retirado recusa sincronização sem ler segredos nem acessar rede', async () => {
  let handler: (req: Request) => Response = () => new Response();
  const fetchSpy = vi.fn();
  const envGet = vi.fn();
  vi.stubGlobal('Deno', { env: { get: envGet }, serve: (fn: typeof handler) => { handler = fn; } });
  vi.stubGlobal('fetch', fetchSpy);
  await import('../../supabase/functions/product-webhook/index');
  const response = handler(new Request('https://exemplo.invalid', { method: 'POST', body: '{"action":"delete"}' }));
  expect(response.status).toBe(410);
  expect((await response.json()).error).toBe('endpoint_desativado');
  expect(envGet).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
});
