import { describe, expect, it } from 'vitest';
import {
  calculateQuoteStockIssues,
  type QuoteStockItem,
  type QuoteStockProduct,
  type QuoteStockSupplierSource,
  type QuoteStockVariant,
} from '@/hooks/quote/useQuotesStockStatus';

const products: QuoteStockProduct[] = [{ id: 'product-a', stock_quantity: 100 }];
const variants: QuoteStockVariant[] = [
  { id: 'variant-a1', product_id: 'product-a', stock_quantity: 40 },
  { id: 'variant-a2', product_id: 'product-a', stock_quantity: 60 },
];

function item(overrides: Partial<QuoteStockItem> = {}): QuoteStockItem {
  return { quote_id: 'quote-a', product_id: 'product-a', quantity: 1, source_variant_id: null, ...overrides };
}

describe('calculateQuoteStockIssues', () => {
  it('acumula a demanda de linhas repetidas do mesmo produto', () => {
    const result = calculateQuoteStockIssues([item({ quantity: 60 }), item({ quantity: 50 })], products, variants, []);

    expect(result).toEqual({ 'quote-a': true });
  });

  it('valida a variante escolhida sem usar estoque de outras variantes', () => {
    const result = calculateQuoteStockIssues([item({ quantity: 50, source_variant_id: 'variant-a1' })], products, variants, []);

    expect(result).toEqual({ 'quote-a': true });
  });

  it('prioriza a quantidade atual da fonte mais recente', () => {
    const sources: QuoteStockSupplierSource[] = [
      { variant_id: 'variant-a1', quantity: 70, updated_at: '2026-01-01T00:00:00Z' },
      { variant_id: 'variant-a1', quantity: 30, updated_at: '2026-02-01T00:00:00Z' },
    ];
    const result = calculateQuoteStockIssues([item({ quantity: 35, source_variant_id: 'variant-a1' })], products, variants, sources);

    expect(result).toEqual({ 'quote-a': true });
  });

  it('marca variante selecionada que não foi retornada pelo catálogo', () => {
    const result = calculateQuoteStockIssues([item({ source_variant_id: 'variant-inexistente' })], products, variants, []);

    expect(result).toEqual({ 'quote-a': true });
  });

  it('ignora itens manuais sem produto de catálogo', () => {
    const result = calculateQuoteStockIssues([item({ product_id: null, quantity: 9_999 })], products, variants, []);

    expect(result).toEqual({});
  });
});
