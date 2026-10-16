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

  it('descarta somente os itens inválidos de uma lista mista', async () => {
    const valid = {
      productId: 'produto-valido',
      addedAt: '2026-10-07T12:00:00.000Z',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([valid, null, { addedAt: valid.addedAt }]));

    const { useFavoritesStore } = await import('@/stores/useFavoritesStore');

    expect(useFavoritesStore.getState().favorites).toEqual([valid]);
    expect(useFavoritesStore.getState().favoriteCount).toBe(1);
  });

  it('sincroniza uma alteração válida recebida de outra aba', async () => {
    const { useFavoritesStore } = await import('@/stores/useFavoritesStore');
    const favorites = [{ productId: 'produto-remoto', addedAt: '2026-10-16T12:00:00.000Z' }];

    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(favorites),
    }));

    expect(useFavoritesStore.getState().favorites).toEqual(favorites);
    expect(useFavoritesStore.getState().favoriteCount).toBe(1);
  });
});
