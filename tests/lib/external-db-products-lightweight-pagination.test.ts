import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPromobrindProductsLightweight } from '@/lib/external-db/products-lightweight';
import { invokeExternalDb } from '@/lib/external-db/bridge';

vi.mock('@/lib/external-db/bridge', () => ({
  invokeBatchBridge: vi.fn(),
  invokeExternalDb: vi.fn(),
}));

function products(offset: number, length: number) {
  return Array.from({ length }, (_, index) => ({
    id: `produto-${offset + index}`,
    name: `Produto ${offset + index}`,
    sku: `SKU-${offset + index}`,
    primary_image_url: null,
    supplier_id: null,
    category_id: null,
    main_category_id: null,
    brand: null,
    is_active: true,
  }));
}

describe('paginação resiliente do catálogo externo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('completa uma página reduzida pelo fallback sem perder o intervalo seguinte', async () => {
    vi.mocked(invokeExternalDb)
      .mockResolvedValueOnce({
        records: products(0, 50),
        count: null,
        meta: { pagination_degraded: true, requested_limit: 100, effective_limit: 50, offset: 0 },
      })
      .mockResolvedValueOnce({ records: products(50, 50), count: null });

    const result = await fetchPromobrindProductsLightweight({ limit: 100, offset: 0 });

    expect(result.map(product => product.id)).toEqual(products(0, 100).map(product => product.id));
    expect(invokeExternalDb).toHaveBeenNthCalledWith(2, expect.objectContaining({
      limit: 50,
      offset: 50,
    }));
  });
});
