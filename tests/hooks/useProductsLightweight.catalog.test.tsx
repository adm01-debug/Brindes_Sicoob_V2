import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useProductsCatalog } from '@/hooks/useProductsLightweight';
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

  it('reconsulta uma página individual quando o lote volta incompleto', async () => {
    vi.mocked(invokeBatchBridge).mockResolvedValueOnce([{ success: false, error: 'Falha na página' }]);
    vi.mocked(fetchPromobrindProductsLightweight).mockResolvedValueOnce([{
      id: 'produto-1', name: 'Garrafa', sku: 'G1', image_url: null,
      primary_image_url: null, supplier_id: null, category_id: null,
      main_category_id: null, brand: null, is_active: true, active: true,
    }]);

    const { result } = renderHook(() => useProductsCatalog(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].products.map(product => product.id)).toEqual(['produto-1']);
    expect(fetchPromobrindProductsLightweight).toHaveBeenCalledOnce();
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
