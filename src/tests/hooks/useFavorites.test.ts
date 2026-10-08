import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useProductAnalytics', () => ({
  useProductAnalytics: () => ({ trackProductView: vi.fn() }),
}));

import { useFavorites } from '@/hooks/useFavorites';

const STORAGE_KEY = 'product-favorites';
const ADDED_AT = '2026-10-06T12:00:00.000Z';

describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('descarta um payload inválido sem quebrar o estado da página', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ productId: 'produto-1' }));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.favorites).toEqual([]);
    expect(result.current.favoriteCount).toBe(0);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('mantém itens válidos do armazenamento local', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { productId: 'produto-1', addedAt: ADDED_AT },
    ]));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.favorites).toEqual([
      { productId: 'produto-1', addedAt: ADDED_AT },
    ]);
  });

  it('preserva os favoritos válidos quando a lista contém itens corrompidos', async () => {
    const valid = { productId: 'produto-1', addedAt: ADDED_AT };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([valid, null, { productId: '' }]));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.favorites).toEqual([valid]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')).toEqual([valid]);
  });
});
