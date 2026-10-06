import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useProductAnalytics', () => ({
  useProductAnalytics: () => ({ trackProductView: vi.fn() }),
}));

import { useFavorites } from '@/hooks/useFavorites';

describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('descarta um payload inválido sem quebrar o estado da página', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem('product-favorites', JSON.stringify({ productId: 'produto-1' }));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.favorites).toEqual([]);
    expect(result.current.favoriteCount).toBe(0);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('mantém itens válidos do armazenamento local', async () => {
    localStorage.setItem('product-favorites', JSON.stringify([
      { productId: 'produto-1', addedAt: '2026-10-06T12:00:00.000Z' },
    ]));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.favorites).toEqual([
      { productId: 'produto-1', addedAt: '2026-10-06T12:00:00.000Z' },
    ]);
  });
});
