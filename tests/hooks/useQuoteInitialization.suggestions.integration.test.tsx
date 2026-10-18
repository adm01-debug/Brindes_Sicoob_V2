import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadProducts, toast } = vi.hoisted(() => ({
  loadProducts: vi.fn(),
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/quote/useQuoteProductSearch', () => ({
  loadQuoteProductsByIds: loadProducts,
}));
vi.mock('sonner', () => ({ toast }));

import { useQuoteInitialization } from '@/hooks/quote/useQuoteInitialization';

function createSetters() {
  const calls = new Map<string, ReturnType<typeof vi.fn>>();
  const target: Record<string, unknown> = { setItemsIfEmpty: undefined, setClientIdIfEmpty: undefined, setActiveItemIndexIfUnset: undefined };
  const setters = new Proxy(target, {
    get: (object, property: string) => {
      if (property in object) return object[property];
      if (!calls.has(property)) calls.set(property, vi.fn());
      return calls.get(property);
    },
  });
  return { setters, call: (name: string) => calls.get(name) ?? vi.fn() };
}

describe('inicialização por sugestões do BI', () => {
  beforeEach(() => {
    loadProducts.mockReset();
    toast.success.mockReset();
    toast.warning.mockReset();
    toast.error.mockReset();
    window.history.replaceState({}, '', '/orcamentos/novo');
  });

  it('carrega itens na ordem solicitada, mantém o cliente e informa indisponibilidade parcial', async () => {
    loadProducts.mockResolvedValue([{ id: 'produto-2', name: 'Mochila', sku: 'MOC-2', price: 50, images: [] }]);
    const { setters, call } = createSetters();

    renderHook(() => useQuoteInitialization({
      isEditMode: false,
      fetchQuote: vi.fn(),
      locationState: null,
      searchParams: new URLSearchParams('source=bi-suggestions&clientId=cliente-1&productIds=produto-2,produto-ausente'),
      setters,
    } as never));

    await waitFor(() => expect(call('setItems')).toHaveBeenCalledTimes(1));
    expect(loadProducts).toHaveBeenCalledWith(['produto-2', 'produto-ausente']);
    expect(call('setClientId')).toHaveBeenCalledWith('cliente-1');
    expect(call('setItems')).toHaveBeenCalledWith([
      expect.objectContaining({ product_id: 'produto-2', product_name: 'Mochila', quantity: 1 }),
    ]);
    expect(call('setActiveItemIndex')).toHaveBeenCalledWith(0);
    expect(toast.warning).toHaveBeenCalledWith('1 produto(s) não estão mais disponíveis e foram ignorados.');
  });

  it('não sobrescreve cliente ou itens escolhidos enquanto a consulta do BI está pendente', async () => {
    let resolveProducts!: (products: Array<{ id: string; name: string; sku: string; price: number; images: string[] }>) => void;
    loadProducts.mockReturnValueOnce(new Promise((resolve) => { resolveProducts = resolve; }));
    let currentClient = '';
    let currentItems: Array<{ product_id: string }> = [];
    const { setters } = createSetters();
    Object.assign(setters, {
      setClientIdIfEmpty: (value: string) => { currentClient ||= value; },
      setItemsIfEmpty: (value: Array<{ product_id: string }>) => { currentItems = currentItems.length ? currentItems : value; },
    });

    renderHook(() => useQuoteInitialization({
      isEditMode: false,
      fetchQuote: vi.fn(),
      locationState: null,
      searchParams: new URLSearchParams('source=bi-suggestions&clientId=cliente-bi&productIds=produto-bi'),
      setters,
    } as never));

    currentClient = 'cliente-escolhido';
    currentItems = [{ product_id: 'produto-escolhido' }];
    resolveProducts([{ id: 'produto-bi', name: 'Produto BI', sku: 'BI-1', price: 10, images: [] }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 produto(s) sugerido(s) adicionado(s) ao orçamento'));

    expect(currentClient).toBe('cliente-escolhido');
    expect(currentItems).toEqual([{ product_id: 'produto-escolhido' }]);
  });
});
