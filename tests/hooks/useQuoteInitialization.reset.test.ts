import { describe, expect, it, vi } from 'vitest';
import { applyExistingQuote } from '@/hooks/quote/useQuoteInitialization';
import type { Quote } from '@/hooks/quotes/quoteTypes';

function createSetters() {
  return {
    setClientId: vi.fn(), setContactId: vi.fn(), setValidUntil: vi.fn(), setNotes: vi.fn(),
    setInternalNotes: vi.fn(), setQuoteNumber: vi.fn(), setCurrentStatus: vi.fn(),
    setIsLatestVersion: vi.fn(), setExpectedRowVersion: vi.fn(), setContactInfo: vi.fn(),
    setCompanyInfo: vi.fn(), setDiscountType: vi.fn(), setDiscountValue: vi.fn(),
    setNegotiationMarkup: vi.fn(), setPaymentTerms: vi.fn(), setShippingType: vi.fn(),
    setShippingCost: vi.fn(), setDeliveryMode: vi.fn(), setDeliveryDate: vi.fn(),
    setDeliveryTime: vi.fn(), setItems: vi.fn(), setTags: vi.fn(), setLoadingQuote: vi.fn(),
    setQuoteLoadError: vi.fn(), setActiveItemIndex: vi.fn(), setExpandedItems: vi.fn(),
  };
}

describe('applyExistingQuote', () => {
  it('zera campos opcionais ausentes ao navegar para outro orçamento', () => {
    const setters = createSetters();
    const quote = {
      client_id: null,
      client_name: null,
      client_company: null,
      valid_until: null,
      notes: null,
      internal_notes: null,
      quote_number: 'ORC-2',
      status: 'draft',
      is_latest_version: true,
      row_version: 1,
      discount_percent: null,
      discount_amount: null,
      negotiation_markup_percent: null,
      payment_terms: null,
      shipping_type: null,
      shipping_cost: null,
      delivery_time: null,
      items: null,
      tags: null,
    } as unknown as Quote;

    applyExistingQuote(quote, setters);

    expect(setters.setContactInfo).toHaveBeenCalledWith(null);
    expect(setters.setCompanyInfo).toHaveBeenCalledWith(null);
    expect(setters.setDiscountValue).toHaveBeenCalledWith(0);
    expect(setters.setNegotiationMarkup).toHaveBeenCalledWith(0);
    expect(setters.setPaymentTerms).toHaveBeenCalledWith('');
    expect(setters.setShippingType).toHaveBeenCalledWith('');
    expect(setters.setShippingCost).toHaveBeenCalledWith(0);
    expect(setters.setDeliveryDate).toHaveBeenCalledWith(undefined);
    expect(setters.setDeliveryTime).toHaveBeenCalledWith('');
    expect(setters.setItems).toHaveBeenCalledWith([]);
    expect(setters.setTags).toHaveBeenCalledWith([]);
  });
});
