import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFavoriteQuickAdd } from '@/hooks/useFavoriteQuickAdd';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import type { Product } from '@/types/product-catalog';

const remote = vi.hoisted(() => ({
  upsert: vi.fn(),
  finalDelete: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useFavoriteLists', () => ({
  useFavoriteLists: () => ({
    lists: [{ id: 'list-1', name: 'Favoritos' }],
    defaultList: { id: 'list-1', name: 'Favoritos' },
    createList: { mutateAsync: vi.fn() },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: async () => ({ data: [], error: null }) }),
      upsert: remote.upsert,
      delete: () => ({
        eq: () => ({ eq: remote.finalDelete }),
      }),
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const product = {
  id: 'product-1',
  name: 'Caneca Sicoob',
  price: 25,
} as Product;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

describe('useFavoriteQuickAdd', () => {
  beforeEach(() => {
    localStorage.clear();
    useFavoritesStore.setState({ favorites: [], favoriteCount: 0, isLoaded: true });
    remote.upsert.mockReset();
    remote.finalDelete.mockReset();
  });

  it('reflete a inclusão local antes de a gravação remota terminar', () => {
    remote.upsert.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFavoriteQuickAdd(), { wrapper });

    act(() => {
      result.current.handleFavoriteClick(product);
    });

    expect(useFavoritesStore.getState().isFavorite(product.id)).toBe(true);
    expect(JSON.parse(localStorage.getItem('product-favorites') ?? '[]')).toEqual([
      expect.objectContaining({ productId: product.id }),
    ]);
  });

  it('reflete a remoção local antes de a exclusão remota terminar', () => {
    useFavoritesStore.getState().addFavorite(product.id);
    remote.finalDelete.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFavoriteQuickAdd(), { wrapper });

    act(() => {
      result.current.handleFavoriteClick(product);
    });

    expect(useFavoritesStore.getState().isFavorite(product.id)).toBe(false);
    expect(JSON.parse(localStorage.getItem('product-favorites') ?? '[]')).toEqual([]);
  });
});
