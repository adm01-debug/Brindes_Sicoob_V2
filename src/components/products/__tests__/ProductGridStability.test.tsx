import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductGrid } from '@/components/products/ProductGrid';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SellerCartProvider } from '@/contexts/SellerCartContext';
import { CollectionsProvider } from '@/contexts/CollectionsContext';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import React from 'react';
import type { Product } from '@/hooks/useProducts';

const PRODUCT_GRID_LOADING_ID = 'product-grid-loading';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProductsProvider>
          <CollectionsProvider>
            <SellerCartProvider>
              <TooltipProvider>
                <BrowserRouter>
                  {ui}
                </BrowserRouter>
              </TooltipProvider>
            </SellerCartProvider>
          </CollectionsProvider>
        </ProductsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock Virtualizer - avoid issues with scroll-based rendering in tests
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count }) => ({
    getTotalSize: () => count * 480,
    getVirtualItems: () => Array.from({ length: count }).map((_, i) => ({
      index: i,
      key: i,
      size: 480,
      start: i * 480,
    })),
    measureElement: () => {},
  })),
}));

const mockProducts: Product[] = [
  { id: '1', name: 'Product 1', sku: 'SKU1', price: 10, images: [], colors: [], supplier: { id: 's1', name: 'S1' }, stock: 100, stockStatus: 'in-stock', category: { id: 'c1', name: 'Cat 1' }, groups: [], materials: [], minQuantity: 1, featured: false, newArrival: false, onSale: false, isKit: false, tags: { publicoAlvo: [], datasComemorativas: [], endomarketing: [], ramo: [], nicho: [] } },
  { id: '2', name: 'Product 2', sku: 'SKU2', price: 20, images: [], colors: [], supplier: { id: 's2', name: 'S2' }, stock: 50, stockStatus: 'low-stock', category: { id: 'c2', name: 'Cat 2' }, groups: [], materials: [], minQuantity: 1, featured: false, newArrival: false, onSale: false, isKit: false, tags: { publicoAlvo: [], datasComemorativas: [], endomarketing: [], ramo: [], nicho: [] } },
];

function loadingTest() {
  const { container } = renderWithProviders(<ProductGrid products={[]} isLoading={true} columns={5} />);
  expect(screen.getByTestId(PRODUCT_GRID_LOADING_ID)).toBeTruthy();
  expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
}

async function transitionTest() {
  const { rerender } = renderWithProviders(<ProductGrid products={[]} isLoading={true} columns={5} />);
  expect(screen.getByTestId(PRODUCT_GRID_LOADING_ID)).toBeTruthy();
  rerender(<QueryClientProvider client={queryClient}><AuthProvider><ProductsProvider><CollectionsProvider><SellerCartProvider><TooltipProvider><BrowserRouter><ProductGrid products={mockProducts} isLoading={false} columns={5} /></BrowserRouter></TooltipProvider></SellerCartProvider></CollectionsProvider></ProductsProvider></AuthProvider></QueryClientProvider>);
  expect(screen.queryByTestId(PRODUCT_GRID_LOADING_ID)).toBeNull();
  expect(screen.getByRole('grid')).toBeTruthy();
  await waitFor(() => { expect(screen.getByText('Product 1')).toBeTruthy(); });
}

function emptyTest() {
  renderWithProviders(<ProductGrid products={[]} isLoading={false} />);
  expect(screen.getByText('Nenhum produto encontrado')).toBeTruthy();
}

describe('ProductGrid Stability and Skeletons', () => {
  it('ProductGrid shows skeletons when isLoading is true', loadingTest);
  it('ProductGrid remains stable while transitioning from loading to loaded', transitionTest);
  it('ProductGrid handles empty search results with grace', emptyTest);
});
