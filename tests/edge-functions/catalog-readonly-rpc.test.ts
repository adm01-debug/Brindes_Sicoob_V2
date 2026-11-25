import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createReadOnlyCatalogFetch } from '../../supabase/functions/_shared/external-read-only';

describe('RPCs somente leitura do catálogo', () => {
  it('envia consulta de personalização via GET e mantém o bloqueio de POST', async () => {
    const requests: Request[] = [];
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const catalog = createClient(
      'https://doufsxqlfjyuvxuezpln.supabase.co',
      'test-publishable-key',
      { global: { fetch: createReadOnlyCatalogFetch(transport) } },
    );

    const result = await catalog.rpc('fn_get_product_customization_options', {
      p_product_id: 'produto-teste',
    }, { get: true });

    expect(result.error).toBeNull();
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(new URL(requests[0].url).searchParams.get('p_product_id')).toBe('produto-teste');
    expect(() => createReadOnlyCatalogFetch(transport)(
      'https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1/rpc/fn_get_customization_price',
      { method: 'POST', body: '{}' },
    )).toThrow('CATALOG_READ_ONLY');
  });
});
