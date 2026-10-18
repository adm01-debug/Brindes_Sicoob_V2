import { describe, expect, it } from 'vitest';
import {
  mapSuggestedProduct,
  parseQuoteSuggestionParams,
} from '@/hooks/quote/useQuoteInitialization';
import { quoteSuggestionKey, type SuggestionItem } from '@/components/bi/ConfirmQuoteSuggestionsModal';

describe('transferência de sugestões do BI para o orçamento', () => {
  it('aceita apenas a origem esperada, deduplica e limita o payload', () => {
    const ids = Array.from({ length: 25 }, (_, index) => `produto-${index}`);
    const params = new URLSearchParams({
      source: 'bi-suggestions',
      clientId: ' cliente-1 ',
      productIds: `${ids.join(',')},produto-0,,produto-1`,
    });

    expect(parseQuoteSuggestionParams(params)).toEqual({
      clientId: 'cliente-1',
      productIds: ids.slice(0, 20),
    });
    expect(parseQuoteSuggestionParams(new URLSearchParams({
      source: 'origem-indevida',
      productIds: 'produto-1',
    }))).toBeNull();
  });

  it('descarta identificadores de controle e preserva dados comerciais do catálogo', () => {
    const params = new URLSearchParams({
      source: 'bi-suggestions',
      clientId: 'cliente\nforjado',
      productIds: 'produto-1,produto\u0000forjado',
    });
    expect(parseQuoteSuggestionParams(params)).toEqual({
      clientId: null,
      productIds: ['produto-1'],
    });

    expect(mapSuggestedProduct({
      id: 'produto-1',
      name: 'Caneca',
      sku: 'CAN-1',
      price: 19.9,
      costPrice: 11,
      images: ['https://cdn.example/caneca.webp'],
      totalStock: 80,
      priceUpdatedAt: '2026-10-16T12:00:00Z',
      priceFreshnessThresholdDays: 7,
    })).toMatchObject({
      product_id: 'produto-1',
      product_name: 'Caneca',
      product_sku: 'CAN-1',
      product_image_url: 'https://cdn.example/caneca.webp',
      quantity: 1,
      unit_price: 19.9,
      unit_cost: 11,
      stock_available: 80,
      personalizations: [],
    });
  });

  it('não colide sugestões homônimas sem vínculo de catálogo', () => {
    const suggestion: SuggestionItem = {
      name: 'Caneca',
      priceFrom: 10,
      priceTo: 20,
      reason: 'Afinidade',
      productId: null,
      imageUrl: null,
      source: 'affinity',
    };
    expect(quoteSuggestionKey(suggestion, 0)).not.toBe(quoteSuggestionKey(suggestion, 1));
    expect(quoteSuggestionKey({ ...suggestion, productId: 'produto-1' }, 0)).toBe('produto-1-0');
  });
});
