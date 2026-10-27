import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductsContext } from '@/contexts/ProductsContextDef';
import type { ProductsContextType } from '@/contexts/ProductsContextDef';
import type { Product } from '@/types/product-catalog';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));
const { emptyHistory, emptyQuickSuggestions, addToHistory, removeFromHistory } = vi.hoisted(() => ({
  emptyHistory: [] as string[],
  emptyQuickSuggestions: [] as Array<{ label: string }>,
  addToHistory: vi.fn(),
  removeFromHistory: vi.fn(),
}));

vi.mock('@/hooks/useSearch', () => ({
  useSearch: () => ({
    history: emptyHistory,
    quickSuggestions: emptyQuickSuggestions,
    addToHistory,
    removeFromHistory,
  }),
}));
vi.mock('@/hooks/useContextualSuggestions', () => ({
  useContextualSuggestions: () => ({ suggestions: [], routeContext: null }),
}));
vi.mock('@/hooks/search/usePopularSearchItems', () => ({
  usePopularSearchItems: () => ({ data: [] }),
}));
vi.mock('@/hooks/search/useVoiceSearchAction', () => ({
  useVoiceSearchAction: () => ({ handleVoiceAction: vi.fn() }),
}));
vi.mock('@/hooks/useDebounce', () => ({ useDebounce: (value: string) => value }));

import { useGlobalSearch } from '@/components/search/useGlobalSearch';

const product: Product = {
  id: 'caneta-001',
  name: 'Caneta Esferográfica Azul',
  sku: 'CAN-001',
  price: 2.5,
  stock: 100,
  stockStatus: 'in-stock',
  images: [],
  colors: [],
  materials: [],
  minQuantity: 1,
  featured: false,
  newArrival: false,
  onSale: false,
  isKit: false,
  category: { id: 'escritorio', name: 'Escritório' },
  supplier: { id: 'fornecedor-1', name: 'Fornecedor' },
  tags: {
    publicoAlvo: [], datasComemorativas: [], endomarketing: [], ramo: [], nicho: [],
  },
};

function createWrapper() {
  const context: ProductsContextType = {
    products: [product],
    isLoading: false,
    getProductById: vi.fn(),
    getProductsByIds: vi.fn(() => [product]),
    registerProducts: vi.fn(),
  };

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <ProductsContext.Provider value={context}>{children}</ProductsContext.Provider>
      </MemoryRouter>
    );
  };
}

describe('useGlobalSearch — fallback do catálogo local', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('exibe produtos já carregados quando semantic-search retorna erro e encerra o estado de IA', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('LOVABLE_API_KEY não configurada') });

    const { result } = renderHook(() => useGlobalSearch(), { wrapper: createWrapper() });
    act(() => result.current.setQuery('caneta'));

    await waitFor(() => expect(result.current.results.some((item) => item.id === product.id)).toBe(true));

    expect(result.current.results[0]).toMatchObject({
      id: product.id,
      type: 'product',
      href: `/produto/${product.id}`,
    });
    expect(result.current.isSearching).toBe(false);
    expect(result.current.isAIProcessing).toBe(false);
  });

  it('usa o catálogo local e encerra o indicador se semantic-search não responde', async () => {
    vi.useFakeTimers();
    invoke.mockImplementation(() => new Promise(() => {}));

    try {
      const { result } = renderHook(() => useGlobalSearch(), { wrapper: createWrapper() });
      act(() => result.current.setQuery('caneta'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(8_000);
      });

      expect(result.current.results.some((item) => item.id === product.id)).toBe(true);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.isAIProcessing).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
