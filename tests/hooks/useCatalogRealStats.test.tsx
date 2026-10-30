import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { invokeExternalDb } from '@/lib/external-db/bridge';
import { useCatalogRealStats } from '@/hooks/useCatalogRealStats';

vi.mock('@/lib/external-db/bridge', () => ({
  invokeExternalDb: vi.fn(),
}));

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('estatísticas reais do catálogo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa a coluna active ao contar fornecedores', async () => {
    vi.mocked(invokeExternalDb).mockImplementation(async ({ table }) => {
      if (table === 'product_variants') return { records: [], count: 12 };
      if (table === 'categories') {
        return { records: [{ id: 'cat-1', name: 'Canecas' }], count: 1 };
      }
      return { records: [], count: 7 };
    });

    const { result } = renderHook(() => useCatalogRealStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invokeExternalDb).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'suppliers', filters: { active: true } }),
    );
    expect(result.current.data).toEqual({
      totalVariants: 12,
      totalCategories: 1,
      totalSuppliers: 7,
    });
  });
});
