import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductGridSkeleton } from '@/components/products/ProductCardSkeleton';
import { CatalogContent } from '@/components/catalog/CatalogContent';
import React from 'react';

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
  it('ProductGridSkeleton renders the correct number of skeletons', () => {
    const count = 12;
    render(<ProductGridSkeleton count={count} stagger={false} />);
    
    // Each ProductCardSkeleton contains several skeletons (images, titles, prices)
    // We check for the container count or a specific marker
    const cards = screen.getAllByRole('img', { hidden: true }).filter(el => el.classList.contains('aspect-[4/5]'));
    // Since images are placeholders, we might need to check for pulse animation or specific structure
    const skeletonCards = document.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBeGreaterThanOrEqual(count);
  });

  it('CatalogContent shows skeleton when shouldShowCatalogSkeleton is true', () => {
    const mockProps: any = {
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

    const { container } = render(<CatalogContent {...mockProps} />);
    
    // Check for the presence of skeletons
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    
    // Check if it's using the correct skeleton variant for grid
    const gridSkeleton = container.querySelector('.grid');
    expect(gridSkeleton).toBeTruthy();
  });
});
