import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { CATALOG_BATCH_PAGES, CATALOG_INITIAL_PAGE_SIZE, CATALOG_PAGE_SIZE, mapLightweightToProduct, PRODUCT_SELECT_LIGHTWEIGHT, useProductsCatalog } from '@/hooks/useProductsLightweight';
import { fetchPromobrindProductsLightweight, invokeBatchBridge } from '@/lib/external-db';

vi.mock('@/lib/external-db', () => ({
  fetchPromobrindProductsLightweight: vi.fn(),
  invokeBatchBridge: vi.fn(),
}));

function createWrapper() {
  const client = new QueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('catálogo externo paginado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta os campos leves necessários aos filtros do catálogo', () => {
    expect(PRODUCT_SELECT_LIGHTWEIGHT).toContain('has_commercial_packaging');
    expect(PRODUCT_SELECT_LIGHTWEIGHT).toContain('is_featured');
    expect(PRODUCT_SELECT_LIGHTWEIGHT).toContain('is_bestseller');
  });

  it('mapeia a indicação de embalagem comercial para os filtros', () => {
    const product = mapLightweightToProduct({
      id: 'produto-embalado', name: 'Caneca', sku: 'C-1',
      primary_image_url: null, supplier_id: null, category_id: null,
      main_category_id: null, brand: null, is_active: true,
      has_commercial_packaging: true,
    });
    expect(product.hasCommercialPackaging).toBe(true);
  });

  it('limita o lote inicial para liberar a primeira tela sem esperar o catálogo inteiro', async () => {
    vi.mocked(invokeBatchBridge).mockResolvedValueOnce(Array.from(
      { length: CATALOG_BATCH_PAGES },
      () => ({ success: true, data: { records: [], count: 7_770 } }),
    ));

    const { result } = renderHook(() => useProductsCatalog(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(CATALOG_INITIAL_PAGE_SIZE).toBe(100);
    expect(CATALOG_PAGE_SIZE).toBe(800);
    expect(CATALOG_BATCH_PAGES).toBe(2);
    expect(invokeBatchBridge).toHaveBeenCalledWith([
      expect.objectContaining({ limit: 100, offset: 0, countMode: 'exact' }),
      expect.objectContaining({ limit: 100, offset: 100 }),
    ]);
  });

  it('reconsulta uma página individual quando o lote volta incompleto', async () => {
    vi.mocked(invokeBatchBridge).mockResolvedValueOnce([{ success: false, error: 'Falha na página' }]);
    vi.mocked(fetchPromobrindProductsLightweight).mockResolvedValueOnce([{
      id: 'produto-1', name: 'Garrafa', sku: 'G1',
      primary_image_url: null, supplier_id: null, category_id: null,
      main_category_id: null, brand: null, is_active: true,
    }]);

    const { result } = renderHook(() => useProductsCatalog(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.products.map(product => product.id)).toEqual(['produto-1']);
    expect(fetchPromobrindProductsLightweight).toHaveBeenCalledOnce();
  });

  it('reconsulta sem pular offsets quando o bridge reduz uma página após timeout', async () => {
    vi.mocked(invokeBatchBridge).mockResolvedValueOnce([
      {
        success: true,
        data: {
          records: Array.from({ length: 50 }, (_, index) => ({ id: `degradado-${index}` })),
          count: null,
          meta: { pagination_degraded: true, requested_limit: 100, effective_limit: 50, offset: 0 },
        },
      },
      { success: true, data: { records: Array.from({ length: 100 }, (_, index) => ({ id: `pagina-2-${index}` })), count: null } },
    ]);
    vi.mocked(fetchPromobrindProductsLightweight).mockResolvedValueOnce(Array.from(
      { length: CATALOG_INITIAL_PAGE_SIZE },
      (_, index) => ({
        id: `completo-${index}`, name: `Produto ${index}`, sku: `SKU-${index}`,
        primary_image_url: null, supplier_id: null,
        category_id: null, main_category_id: null, brand: null,
        is_active: true,
      }),
    ));

    const { result } = renderHook(() => useProductsCatalog(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.products).toHaveLength(CATALOG_INITIAL_PAGE_SIZE);
    expect(result.current.data?.pages[0]?.nextOffset).toBe(CATALOG_INITIAL_PAGE_SIZE);
    expect(fetchPromobrindProductsLightweight).toHaveBeenCalledWith(expect.objectContaining({
      limit: CATALOG_INITIAL_PAGE_SIZE,
      offset: 0,
    }));
  });

  it('mostra erro de configuração sem repetir a consulta', async () => {
    vi.mocked(invokeBatchBridge).mockRejectedValueOnce(new Error('CATALOG_NOT_CONFIGURED'));
    vi.mocked(fetchPromobrindProductsLightweight).mockRejectedValueOnce(new Error('CATALOG_NOT_CONFIGURED'));

    const { result } = renderHook(() => useProductsCatalog({ search: 'garrafa' }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('CATALOG_NOT_CONFIGURED');
    expect(invokeBatchBridge).toHaveBeenCalledOnce();
    expect(fetchPromobrindProductsLightweight).toHaveBeenCalledOnce();
  });
});
