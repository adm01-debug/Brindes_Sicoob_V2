import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { invokeExternalDb } from '@/lib/external-db/bridge';
import { useSimilarProducts } from '@/hooks/useSimilarProducts';

vi.mock('@/lib/external-db/bridge', () => ({
  invokeExternalDb: vi.fn(),
}));

vi.mock('@/lib/private-storage', () => ({
  resolvePrivateStorageUrlSafe: vi.fn(async (value: string | null | undefined) =>
    typeof value === 'string' ? value.replace('supabase-storage://', 'https://assinada/') : null),
}));

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('produtos semelhantes com storage privado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('assina a referencia privada antes de entregar o card', async () => {
    vi.mocked(invokeExternalDb).mockImplementation(async ({ table }) => {
      if (table === 'product_relationships') {
        return { records: [{ related_product_id: 'produto-2' }], count: 1 };
      }
      if (table === 'products') {
        return {
          records: [{
            id: 'produto-2',
            name: 'Caneca',
            sku: 'SKU-2',
            sale_price: 25,
            primary_image_url: 'supabase-storage://personalization-images/caneca.png',
            supplier_id: 'f1',
            stock_quantity: 10,
            brand: 'Marca',
            category_id: 'cat-1',
          }],
          count: 1,
        };
      }
      return { records: [], count: 0 };
    });

    const product = { id: 'produto-1', category_id: 'cat-1', supplier: { id: 'f1' } };
    const { result } = renderHook(
      () => useSimilarProducts(product as never),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data?.length).toBe(1));
    expect(result.current.data?.[0].image_url).toBe('https://assinada/personalization-images/caneca.png');
  });
});