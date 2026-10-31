import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ProductGridSkeleton } from '@/components/products/ProductCardSkeleton';
import { CatalogContent } from '@/components/catalog/CatalogContent';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

interface RuntimeConfigGlobal {
  __PORTAL_SICOOB_RUNTIME_CONFIG__?: {
    url: string;
    publishableKey: string;
  };
}

vi.mock('@/contexts/SellerCartContext', () => ({
  useSellerCartContext: () => ({
    activeCart: null,
    addToActiveCart: vi.fn(),
  }),
}));

// Define globally needed variables for backend client tests.
(globalThis as typeof globalThis & RuntimeConfigGlobal).__PORTAL_SICOOB_RUNTIME_CONFIG__ = {
  url: 'https://mock.supabase.co',
  publishableKey: 'mock-key',
};

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
      <BrowserRouter>
        {ui}
      </BrowserRouter>
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

describe('ProductGrid Loading Visuals', () => {
  it('ProductGridSkeleton renders the correct number of skeleton cards', () => {
    const count = 12;
    const { container } = render(<ProductGridSkeleton count={count} stagger={false} />);
    
    // Check for containers with animate-pulse which represent the skeleton cards
    const skeletonCards = container.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBe(count);
  });

  it('CatalogContent shows skeleton when shouldShowCatalogSkeleton is true', () => {
    const mockProps: React.ComponentProps<typeof CatalogContent> = {
      viewMode: 'grid',
      shouldShowCatalogSkeleton: true,
      shouldShowEmptyState: false,
      hasActiveCatalogConstraints: false,
      paginatedProducts: [],
      filteredProducts: [],
      gridColumns: 5,
      hasMoreProducts: false,
      isLoadingMore: false,
      totalEstimate: 0,
      loadMoreRef: { current: null },
      itemsPerPage: 24,
      navigate: () => {},
      handleViewProduct: () => {},
      handleShareProduct: () => {},
      handleFavoriteProduct: () => {},
      isFavorite: () => false,
      toggleFavorite: () => {},
      isInCompare: () => false,
      onToggleCompare: () => ({ added: false, isFull: false }),
      canAddToCompare: true,
    };

    const { container } = renderWithProviders(<CatalogContent {...mockProps} />);
    
    // Check for the presence of skeletons
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    
    // Check if it's using the correct skeleton container grid
    const gridSkeleton = container.querySelector('.grid');
    expect(gridSkeleton).toBeTruthy();
  });
});
