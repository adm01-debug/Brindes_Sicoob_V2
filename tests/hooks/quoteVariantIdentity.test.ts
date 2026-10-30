import { describe, expect, it } from "vitest";

import { findMergeableQuoteItemIndex, quoteItemsShareVariantIdentity } from "@/hooks/quotes/quoteVariantIdentity";
import type { QuoteItem } from "@/hooks/quotes/quoteTypes";

const quoteItem = (overrides: Partial<Pick<QuoteItem,
  "product_id" | "color_name" | "size_code" | "source_variant_id" | "source_variant_sku" | "unit_price" | "unit_cost"
>> = {}) => ({
  product_id: "produto-1",
  color_name: "Verde",
  size_code: "M",
  source_variant_id: "variante-1",
  source_variant_sku: "SKU-1",
  unit_price: 10,
  unit_cost: 4,
  ...overrides,
});

describe("identidade de variante em linhas de orçamento", () => {
  it("reconhece a mesma variante pelo id e SKU", () => {
    expect(quoteItemsShareVariantIdentity(
      { source_variant_id: "variante-1", source_variant_sku: "SKU-1" },
      { source_variant_id: "variante-1", source_variant_sku: "SKU-1" },
    )).toBe(true);
  });

  it("mantém separadas variantes diferentes com a mesma cor e tamanho", () => {
    expect(quoteItemsShareVariantIdentity(
      { source_variant_id: "variante-1", source_variant_sku: "SKU-1" },
      { source_variant_id: "variante-2", source_variant_sku: "SKU-2" },
    )).toBe(false);
  });

  it("mantém separadas linhas quando o SKU difere mesmo sem id da variante", () => {
    expect(quoteItemsShareVariantIdentity(
      { source_variant_id: null, source_variant_sku: "SKU-1" },
      { source_variant_id: null, source_variant_sku: "SKU-2" },
    )).toBe(false);
  });

  it("preserva a consolidação de linhas sem identidade de variante", () => {
    expect(quoteItemsShareVariantIdentity(
      { source_variant_id: undefined, source_variant_sku: undefined },
      { source_variant_id: null, source_variant_sku: null },
    )).toBe(true);
  });

  it("consolida a mesma variante e preserva uma variante com preço/SKU distinto", () => {
    const existing = quoteItem();
    const sameVariant = quoteItem();
    const otherVariant = quoteItem({ source_variant_id: "variante-2", source_variant_sku: "SKU-2", unit_price: 15 });

    expect(findMergeableQuoteItemIndex([existing], sameVariant)).toBe(0);
    expect(findMergeableQuoteItemIndex([existing], otherVariant)).toBe(-1);
  });

  it("não consolida a mesma variante se o preço ou custo de catálogo mudou", () => {
    const existing = quoteItem();
    expect(findMergeableQuoteItemIndex([existing], quoteItem({ unit_price: 12 }))).toBe(-1);
    expect(findMergeableQuoteItemIndex([existing], quoteItem({ unit_cost: 5 }))).toBe(-1);
  });
});
