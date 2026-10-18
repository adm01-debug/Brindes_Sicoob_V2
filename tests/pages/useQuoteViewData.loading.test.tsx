import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { selectCrmById } = vi.hoisted(() => ({ selectCrmById: vi.fn() }));

vi.mock('@/lib/crm-db', () => ({ selectCrmById }));

import { useLoadedQuote } from '@/pages/quote-view/useQuoteViewData';

describe('carregamento do detalhe completo do orçamento', () => {
  beforeEach(() => selectCrmById.mockReset());

  it('encerra o loading, mostra a falha e permite tentar novamente', async () => {
    const fetchQuote = vi.fn()
      .mockRejectedValueOnce(new Error('Banco temporariamente indisponível'))
      .mockResolvedValueOnce({ id: 'quote-1', status: 'draft', items: [] });
    const { result } = renderHook(() => useLoadedQuote('quote-1', fetchQuote as never));

    await waitFor(() => expect(result.current.isLoadingQuote).toBe(false));
    expect(result.current.quote).toBeNull();
    expect(result.current.quoteLoadError).toBe('Banco temporariamente indisponível');

    await act(async () => result.current.retryQuoteLoad());
    expect(result.current.quote).toMatchObject({ id: 'quote-1', items: [] });
    expect(result.current.quoteLoadError).toBeNull();
    expect(fetchQuote).toHaveBeenCalledTimes(2);
  });

  it('mantém o orçamento quando o CRM não possui dados complementares', async () => {
    selectCrmById.mockResolvedValue(null);
    const fetchQuote = vi.fn().mockResolvedValue({
      id: 'quote-2',
      status: 'draft',
      client_id: 'cliente-2',
      items: [{ id: 'item-1', product_id: 'produto-1' }],
    });
    const { result } = renderHook(() => useLoadedQuote('quote-2', fetchQuote as never));

    await waitFor(() => expect(result.current.isLoadingQuote).toBe(false));
    expect(result.current.quote).toMatchObject({ id: 'quote-2' });
    expect(result.current.quoteLoadError).toBeNull();
  });

  it('não permanece carregando quando a rota não possui identificador', async () => {
    const fetchQuote = vi.fn();
    const { result } = renderHook(() => useLoadedQuote(undefined, fetchQuote as never));

    await waitFor(() => expect(result.current.isLoadingQuote).toBe(false));
    expect(fetchQuote).not.toHaveBeenCalled();
  });
});
