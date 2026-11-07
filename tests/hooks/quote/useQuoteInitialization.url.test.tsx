import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchProduct } = vi.hoisted(() => ({ fetchProduct: vi.fn() }));

vi.mock('@/lib/external-db', () => ({ fetchPromobrindProductById: fetchProduct }));
vi.mock('@/utils/product-mapper', () => ({
  mapPromobrindToProduct: (product: unknown) => product,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useQuoteInitialization } from '@/hooks/quote/useQuoteInitialization';

describe('useQuoteInitialization com produtos na URL', () => {
  beforeEach(() => fetchProduct.mockReset());

  it('hidrata comparação pelo catálogo e reaproveita somente o ID do cliente', async () => {
    fetchProduct.mockResolvedValue({
      id: 'produto-1',
      name: 'Nome canônico',
      sku: 'SKU-1',
      price: 24.9,
      minQuantity: 25,
      images: ['https://catalogo.example/produto.png'],
      stock: 150,
    });
    const setters = {
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
      setActiveItemIndex: vi.fn(),
      setExpandedItems: vi.fn(),
    };

    renderHook(() =>
      useQuoteInitialization({
        isEditMode: false,
        fetchQuote: async () => null,
        locationState: null,
        searchParams: new URLSearchParams(
          'products=produto-1&client_id=cliente-1&client_name=Nome%20falso&product_price=0.01',
        ),
        setters,
      }),
    );

    await waitFor(() => expect(setters.setItems).toHaveBeenCalledTimes(1));
    expect(fetchProduct).toHaveBeenCalledWith('produto-1');
    expect(setters.setClientId).toHaveBeenCalledWith('cliente-1');
    expect(setters.setItems.mock.calls[0]?.[0]).toMatchObject([
      {
        product_id: 'produto-1',
        product_name: 'Nome canônico',
        unit_price: 24.9,
        quantity: 25,
      },
    ]);
  });

  it('não consulta o catálogo quando o construtor está editando orçamento existente', () => {
    renderHook(() =>
      useQuoteInitialization({
        isEditMode: true,
        quoteId: 'orcamento-existente',
        fetchQuote: async () => null,
        locationState: null,
        searchParams: new URLSearchParams('product_id=produto-1'),
        setters: {
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
          setActiveItemIndex: vi.fn(),
          setExpandedItems: vi.fn(),
        },
      }),
    );

    expect(fetchProduct).not.toHaveBeenCalled();
  });
});
