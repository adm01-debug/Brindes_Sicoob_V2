import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPromobrindProductsLightweight } from '@/lib/external-db/products-lightweight';
import { invokeBatchBridge, invokeExternalDb } from '@/lib/external-db/bridge';

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

  it('completa uma página degradada dentro do burst inicial antes de avançar o offset', async () => {
    vi.mocked(invokeBatchBridge).mockResolvedValueOnce([
      {
        success: true,
        data: {
          records: products(0, 50),
          count: null,
          meta: { pagination_degraded: true, requested_limit: 500, effective_limit: 50, offset: 0 },
        },
      },
      { success: true, data: { records: products(500, 500), count: null } },
      { success: true, data: { records: products(1_000, 500), count: null } },
      { success: true, data: { records: products(1_500, 1), count: null } },
    ]);
    vi.mocked(invokeExternalDb).mockResolvedValueOnce({ records: products(50, 450), count: null });

    const result = await fetchPromobrindProductsLightweight();

    expect(result.map(product => product.id)).toEqual([
      ...products(0, 500),
      ...products(500, 500),
      ...products(1_000, 500),
      ...products(1_500, 1),
    ].map(product => product.id));
    expect(invokeExternalDb).toHaveBeenCalledWith(expect.objectContaining({ limit: 450, offset: 50 }));
  });

  it('reconsulta uma página ausente do burst inicial em vez de pular o intervalo', async () => {
    vi.mocked(invokeBatchBridge).mockResolvedValueOnce([
      { success: false, error: 'Falha temporária' },
      { success: true, data: { records: products(500, 1), count: null } },
      { success: true, data: { records: [], count: null } },
      { success: true, data: { records: [], count: null } },
    ]);
    vi.mocked(invokeExternalDb).mockResolvedValueOnce({ records: products(0, 500), count: null });

    const result = await fetchPromobrindProductsLightweight();

    expect(result.map(product => product.id)).toEqual([
      ...products(0, 500),
      ...products(500, 1),
    ].map(product => product.id));
    expect(invokeExternalDb).toHaveBeenCalledWith(expect.objectContaining({ limit: 500, offset: 0 }));
  });
});
