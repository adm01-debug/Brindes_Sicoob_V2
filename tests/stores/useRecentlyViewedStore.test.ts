import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRecentlyViewedStore } from '@/stores/useRecentlyViewedStore';

describe('useRecentlyViewedStore — isolamento por sessão e organização', () => {
  beforeEach(() => {
    localStorage.clear();
    useRecentlyViewedStore.getState().reset();
  });

  it('mantém históricos separados ao alternar de organização', () => {
    act(() => useRecentlyViewedStore.getState().setScope('user:u1:org:a'));
    act(() => useRecentlyViewedStore.getState().addToRecentlyViewed('produto-a'));

    act(() => useRecentlyViewedStore.getState().setScope('user:u1:org:b'));
    expect(useRecentlyViewedStore.getState().items).toEqual([]);
    act(() => useRecentlyViewedStore.getState().addToRecentlyViewed('produto-b'));

    act(() => useRecentlyViewedStore.getState().setScope('user:u1:org:a'));
    expect(useRecentlyViewedStore.getState().items.map(item => item.productId)).toEqual(['produto-a']);
  });

  it('limpa memória e armazenamento do escopo corrente no logout', () => {
    act(() => useRecentlyViewedStore.getState().setScope('user:u1:org:a'));
    act(() => useRecentlyViewedStore.getState().addToRecentlyViewed('produto-a'));
    const key = 'recently-viewed-products:user%3Au1%3Aorg%3Aa';
    expect(localStorage.getItem(key)).not.toBeNull();

    act(() => useRecentlyViewedStore.getState().reset());

    expect(useRecentlyViewedStore.getState()).toMatchObject({
      items: [],
      itemCount: 0,
      scopeKey: null,
    });
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('não registra produto enquanto a identidade do escopo não foi definida', () => {
    act(() => useRecentlyViewedStore.getState().addToRecentlyViewed('produto-sem-escopo'));
    expect(useRecentlyViewedStore.getState().items).toEqual([]);
  });
});
