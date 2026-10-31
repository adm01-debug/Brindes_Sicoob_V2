import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { fetchPromobrindProducts } from '@/lib/external-db';
import { useProducts } from '@/hooks/useProducts';

vi.mock('@/lib/external-db', () => ({
  fetchPromobrindProducts: vi.fn(),
  fetchPromobrindProductById: vi.fn(),
}));

vi.mock('@/utils/product-mapper', () => ({
  mapPromobrindToProduct: vi.fn((product) => product),
}));

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('relevância da busca de produtos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ordena de forma insensível a maiúsculas e minúsculas', async () => {
    vi.mocked(fetchPromobrindProducts).mockResolvedValueOnce([
      { id: 'generico', name: 'Acessório genérico', price: 1 },
      { id: 'copo', name: 'Kit com copo térmico', price: 2 },
    ] as never[]);

    const { result } = renderHook(() => useProducts({ search: 'COPO' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((product) => product.id)).toEqual(['copo', 'generico']);
  });
});
