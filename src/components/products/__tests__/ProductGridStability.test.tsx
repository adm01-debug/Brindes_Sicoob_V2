import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductGrid } from '@/components/products/ProductGrid';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SellerCartProvider } from '@/contexts/SellerCartContext';
import { CollectionsProvider } from '@/contexts/CollectionsContext';
import { ProductsProvider } from '@/contexts/ProductsContext';
import React from 'react';

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

describe('ProductGrid Stability and Skeletons', () => {
  it('ProductGrid shows skeletons when isLoading is true', () => {
    const { container } = renderWithProviders(
      <ProductGrid products={[]} isLoading={true} columns={5} />
    );
    
    // Check for our loading container test ID or pulse animation
    const loadingState = screen.getByTestId('product-grid-loading');
    expect(loadingState).toBeTruthy();
    
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('ProductGrid remains stable while transitioning from loading to loaded', async () => {
    const mockProducts = [
      { id: '1', name: 'Product 1', sku: 'SKU1', price: 10, images: [], colors: [], supplier: { name: 'S1' }, stock: 100, stockStatus: 'in-stock' },
      { id: '2', name: 'Product 2', sku: 'SKU2', price: 20, images: [], colors: [], supplier: { name: 'S2' }, stock: 50, stockStatus: 'low-stock' }
    ] as any;

    const { rerender, container } = renderWithProviders(
      <ProductGrid products={[]} isLoading={true} columns={5} />
    );

    // Should have loading state
    expect(screen.getByTestId('product-grid-loading')).toBeTruthy();
    
    // Rerender as loaded
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductsProvider>
          <CollectionsProvider>
            <SellerCartProvider>
              <TooltipProvider>
                <BrowserRouter>
                  <ProductGrid products={mockProducts} isLoading={false} columns={5} />
                </BrowserRouter>
              </TooltipProvider>
            </SellerCartProvider>
          </CollectionsProvider>
        </ProductsProvider>
      </QueryClientProvider>
    );

    // Should no longer have loading state
    expect(screen.queryByTestId('product-grid-loading')).toBeNull();
    
    // Should show grid
    const grid = screen.getByRole('grid');
    expect(grid).toBeTruthy();
    
    // Virtualizer might take a moment to render items
    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeTruthy();
    });
  });

  it('ProductGrid handles empty search results with grace', () => {
    renderWithProviders(
      <ProductGrid products={[]} isLoading={false} />
    );
    
    expect(screen.getByText('Nenhum produto encontrado')).toBeTruthy();
  });
});
