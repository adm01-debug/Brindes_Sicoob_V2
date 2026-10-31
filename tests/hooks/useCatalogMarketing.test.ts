import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));

import { fetchCatalogMarketingProductIds } from '@/hooks/useCatalogMarketing';

describe('curadoria editorial do catálogo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não consulta o banco quando nenhuma classificação foi selecionada', async () => {
    await expect(fetchCatalogMarketingProductIds('publico_alvo', [])).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('aceita slug ou nome normalizado, pagina vínculos e elimina duplicados', async () => {
    const termsEq = vi.fn();
    termsEq
      .mockReturnValueOnce({ eq: termsEq })
      .mockResolvedValueOnce({
        data: [
          { id: 'termo-1', slug: 'produtor-rural', name: 'Produtor rural' },
          { id: 'termo-2', slug: 'medico', name: 'Médico' },
        ],
        error: null,
      });
    const termsSelect = vi.fn(() => ({ eq: termsEq }));

    const range = vi.fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, index) => ({ product_id: `produto-${index}` })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ product_id: 'produto-999' }, { product_id: 'produto-1000' }],
        error: null,
      });
    const mappingQuery = { order: vi.fn(), range };
    mappingQuery.order.mockReturnValue(mappingQuery);
    const mappingIn = vi.fn(() => mappingQuery);
    const mappingSelect = vi.fn(() => ({ in: mappingIn }));

    from.mockImplementation((table: string) => (
      table === 'catalog_marketing_terms'
        ? { select: termsSelect }
        : { select: mappingSelect }
    ));

    const result = await fetchCatalogMarketingProductIds('publico_alvo', ['PRODUTOR RURAL', 'médico']);

    expect(result).toHaveLength(1001);
    expect(mappingSelect).toHaveBeenCalledWith('product_id,term_id');
    expect(mappingIn).toHaveBeenCalledWith('term_id', ['termo-1', 'termo-2']);
    expect(mappingQuery.order).toHaveBeenNthCalledWith(1, 'product_id', { ascending: true });
    expect(mappingQuery.order).toHaveBeenNthCalledWith(2, 'term_id', { ascending: true });
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});
