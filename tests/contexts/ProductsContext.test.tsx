import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
});
