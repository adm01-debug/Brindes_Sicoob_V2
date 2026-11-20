import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchProducts } = vi.hoisted(() => ({ fetchProducts: vi.fn() }));

vi.mock('@/lib/external-db', () => ({
  fetchPromobrindProducts: fetchProducts,
  getProductImageUrl: (product: { image_url?: string }) => product.image_url ?? null,
}));

vi.mock('@/hooks/useProducts', () => ({ findKnownHex: () => null }));

import { loadQuoteProductsByIds } from '@/hooks/quote/useQuoteProductSearch';

describe('carregamento de sugestões por produto', () => {
  beforeEach(() => fetchProducts.mockReset());

  it('deduplica a consulta e devolve somente produtos ativos na ordem solicitada', async () => {
    fetchProducts.mockResolvedValue([
      { id: 'produto-2', name: 'Mochila', sku: 'MOC-2', sale_price: 50, image_url: null },
      { id: 'produto-1', name: 'Caneca', sku: 'CAN-1', sale_price: 20, image_url: null },
    ]);

    const products = await loadQuoteProductsByIds(['produto-1', 'produto-2', 'produto-1']);

    expect(fetchProducts).toHaveBeenCalledWith({
      filters: { id: ['produto-1', 'produto-2'], is_active: true },
      limit: 2,
    });
    expect(products.map((product) => product.id)).toEqual(['produto-1', 'produto-2']);
  });

  it('não consulta a origem quando não recebe identificadores', async () => {
    await expect(loadQuoteProductsByIds([])).resolves.toEqual([]);
    expect(fetchProducts).not.toHaveBeenCalled();
  });
});
