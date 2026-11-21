import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useMemo } from 'react';
import type { Product } from '@/hooks/useProducts';

const { fetchPromobrindProducts } = vi.hoisted(() => ({
  fetchPromobrindProducts: vi.fn(),
}));

vi.mock('@/lib/external-db', () => ({
  fetchPromobrindProducts,
}));

vi.mock('@/hooks/useProducts', () => ({
  mapPromobrindToProduct: (product: Product) => product,
}));

import { ProductsProvider, useProductsContext } from '@/contexts/ProductsContext';

const product = {
  id: 'produto-1',
  name: 'Produto persistido',
} as Product;

function ProductsProbe() {
  const { getProductsByIds } = useProductsContext();
  const products = getProductsByIds([product.id]);
  return <output data-testid="products">{products.map((item) => item.name).join(',')}</output>;
}

describe('ProductsProvider', () => {
  beforeEach(() => {
    fetchPromobrindProducts.mockReset();
  });

  it('renderiza o produto assim que a busca sob demanda atualiza o cache', async () => {
    fetchPromobrindProducts.mockResolvedValueOnce([product]);

    render(
      <ProductsProvider>
        <ProductsProbe />
      </ProductsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('products')).toHaveTextContent(product.name);
    });
    expect(fetchPromobrindProducts).toHaveBeenCalledWith({
      filters: { id: [product.id] },
      limit: 1,
    });
  });

  it('carrega 51 ids em dois lotes (limite da ponte de 50)', async () => {
    const id2 = { id: 'produto-2', name: 'Segundo produto' } as Product;
    const firstBatch = Array.from({ length: 50 }, (_, i) => ({
      id: `lote-1-${i}`,
      name: `Lote 1 - ${i}`,
    })) as Product[];
    fetchPromobrindProducts.mockImplementation((opts: { filters: { id: string[] } }) =>
      Promise.resolve(opts.filters.id.includes(id2.id) ? [id2] : firstBatch),
    );

    // Espelha o padrão real da FavoritesPage/ComparePage: getProductsByIds
    // chamado dentro de useMemo reativo ao `products` do contexto.
    function BatchProbe() {
      const { getProductsByIds, products: cacheSignal } = useProductsContext();
      const loaded = useMemo(
        () => getProductsByIds([...firstBatch.map((p) => p.id), id2.id]),
        [getProductsByIds, cacheSignal],
      );
      return <output data-testid="batch">{loaded.map((item) => item.id).join(',')}</output>;
    }

    render(
      <ProductsProvider>
        <BatchProbe />
      </ProductsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('batch')).toHaveTextContent(id2.id);
    });
    const calls = fetchPromobrindProducts.mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[0][0].filters.id.length).toBe(50);
    expect(calls[1][0].filters.id.length).toBe(1);
  });

  it('resposta vazia (falha total) não dispara nova consulta', async () => {
    fetchPromobrindProducts.mockImplementation(() => Promise.resolve([]));

    const emptyIds = ['ausente-1', 'ausente-2', 'ausente-3'];
    function EmptyProbe() {
      const { getProductsByIds, products: cacheSignal } = useProductsContext();
      const loaded = useMemo(
        () => getProductsByIds(emptyIds),
        [getProductsByIds, cacheSignal],
      );
      return <output data-testid="empty">{loaded.length}</output>;
    }

    render(
      <ProductsProvider>
        <EmptyProbe />
      </ProductsProvider>,
    );

    // A primeira consulta é disparada pelo batch (50ms). Espera ela acontecer.
    await vi.waitFor(() => {
      expect(fetchPromobrindProducts).toHaveBeenCalledTimes(1);
    });
    // Após a falha, o provider não publica cache novo; o consumidor que espelha
    // a FavoritesPage não re-enfileira os mesmos ids ausentes.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(fetchPromobrindProducts).toHaveBeenCalledTimes(1);
  });
});
