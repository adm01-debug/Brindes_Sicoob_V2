import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useQuoteInitialization } from '@/hooks/quote/useQuoteInitialization';

function createSetters() {
  const calls = new Map<string, ReturnType<typeof vi.fn>>();
  const setters = new Proxy({}, {
    get: (_target, property: string) => {
      if (!calls.has(property)) calls.set(property, vi.fn());
      return calls.get(property);
    },
  });
  return { setters, call: (name: string) => calls.get(name) ?? vi.fn() };
}

function params(fetchQuote: ReturnType<typeof vi.fn>, setters: object, reloadKey = 0) {
  return {
    isEditMode: true,
    quoteId: 'quote-1',
    reloadKey,
    fetchQuote,
    locationState: null,
    searchParams: new URLSearchParams(),
    setters,
  } as never;
}

describe('carregamento inicial do orçamento', () => {
  it('encerra o loading, apresenta erro e permite uma nova tentativa', async () => {
    const fetchQuote = vi.fn()
      .mockRejectedValueOnce(new Error('indisponível'))
      .mockResolvedValueOnce(null);
    const { setters, call } = createSetters();
    const { rerender } = renderHook(
      ({ reloadKey }) => useQuoteInitialization(params(fetchQuote, setters, reloadKey)),
      { initialProps: { reloadKey: 0 } },
    );

    await waitFor(() => {
      expect(call('setQuoteLoadError')).toHaveBeenLastCalledWith(
        'Não foi possível carregar o orçamento.',
      );
      expect(call('setLoadingQuote')).toHaveBeenLastCalledWith(false);
    });

    rerender({ reloadKey: 1 });
    await waitFor(() => {
      expect(fetchQuote).toHaveBeenCalledTimes(2);
      expect(call('setQuoteLoadError')).toHaveBeenLastCalledWith('Orçamento não encontrado.');
      expect(call('setLoadingQuote')).toHaveBeenLastCalledWith(false);
    });
  });

  it('não usa o identificador da empresa como identificador do contato', async () => {
    const fetchQuote = vi.fn().mockResolvedValue({
      id: 'quote-1',
      client_id: 'empresa-1',
      status: 'draft',
      subtotal: 0,
      discount_percent: 0,
      discount_amount: 0,
      total: 0,
    });
    const { setters, call } = createSetters();
    renderHook(() => useQuoteInitialization(params(fetchQuote, setters)));

    await waitFor(() => expect(call('setLoadingQuote')).toHaveBeenLastCalledWith(false));
    expect(call('setClientId')).toHaveBeenCalledWith('empresa-1');
    expect(call('setContactId')).toHaveBeenCalledWith('');
  });
});
