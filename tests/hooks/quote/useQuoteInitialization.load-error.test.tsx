import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  useQuoteInitialization,
  QUOTE_LOAD_FAILED,
  QUOTE_LOAD_NOT_FOUND,
} from '@/hooks/quote/useQuoteInitialization';

const buildSetters = () => ({
  setClientId: vi.fn(),
  setContactId: vi.fn(),
  setValidUntil: vi.fn(),
  setNotes: vi.fn(),
  setInternalNotes: vi.fn(),
  setQuoteNumber: vi.fn(),
  setCurrentStatus: vi.fn(),
  setIsLatestVersion: vi.fn(),
  setExpectedRowVersion: vi.fn(),
  setContactInfo: vi.fn(),
  setCompanyInfo: vi.fn(),
  setDiscountType: vi.fn(),
  setDiscountValue: vi.fn(),
  setNegotiationMarkup: vi.fn(),
  setPaymentTerms: vi.fn(),
  setShippingType: vi.fn(),
  setShippingCost: vi.fn(),
  setDeliveryMode: vi.fn(),
  setDeliveryDate: vi.fn(),
  setDeliveryTime: vi.fn(),
  setItems: vi.fn(),
  setTags: vi.fn(),
  setLoadingQuote: vi.fn(),
  setQuoteLoadError: vi.fn(),
  setActiveItemIndex: vi.fn(),
  setExpandedItems: vi.fn(),
});

const renderInit = (fetchQuote: (id: string) => Promise<unknown>, setters = buildSetters()) =>
  renderHook(() =>
    useQuoteInitialization({
      isEditMode: true,
      quoteId: 'orcamento-1',
      fetchQuote: fetchQuote as never,
      locationState: null,
      searchParams: new URLSearchParams(),
      setters: setters as never,
    }),
  );

describe('useQuoteInitialization em falha de leitura', () => {
  beforeEach(() => vi.clearAllMocks());

  it('encerra o carregamento e avisa quando a busca do orçamento rejeita', async () => {
    const setters = buildSetters();
    renderInit(() => Promise.reject(new Error('rede fora')), setters);

    await waitFor(() => expect(setters.setLoadingQuote).toHaveBeenLastCalledWith(false));
    expect(setters.setQuoteLoadError).toHaveBeenCalledWith(QUOTE_LOAD_FAILED);
  });

  it('avisa quando o orçamento não existe ou não tem permissão', async () => {
    const setters = buildSetters();
    renderInit(async () => null, setters);

    await waitFor(() => expect(setters.setLoadingQuote).toHaveBeenLastCalledWith(false));
    expect(setters.setQuoteLoadError).toHaveBeenCalledWith(QUOTE_LOAD_NOT_FOUND);
  });
});
