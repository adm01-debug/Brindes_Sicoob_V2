import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'product-favorites';

describe('useFavoritesStore — hidratação defensiva', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it.each([
    ['JSON malformado', '{not-json'],
    ['objeto no lugar da lista', JSON.stringify({ productId: 'produto-1' })],
    ['item sem identificador', JSON.stringify([{ addedAt: '2026-10-07T12:00:00.000Z' }])],
  ])('descarta %s sem corromper o estado', async (_label, raw) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem(STORAGE_KEY, raw);

    const { useFavoritesStore } = await import('@/stores/useFavoritesStore');

    expect(useFavoritesStore.getState().favorites).toEqual([]);
    expect(useFavoritesStore.getState().favoriteCount).toBe(0);
    expect(consoleError).toHaveBeenCalledWith(
      expect.any(String),
      'Error loading favorites:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it('preserva uma lista válida com variante', async () => {
    const favorites = [{
      productId: 'produto-1',
      addedAt: '2026-10-07T12:00:00.000Z',
      variant: { color_name: 'Verde Sicoob' },
    }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));

    const { useFavoritesStore } = await import('@/stores/useFavoritesStore');

    expect(useFavoritesStore.getState().favorites).toEqual(favorites);
    expect(useFavoritesStore.getState().favoriteCount).toBe(1);
  });
});
