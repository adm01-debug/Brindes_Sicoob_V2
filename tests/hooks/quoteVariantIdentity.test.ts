import { describe, expect, it } from "vitest";

import { findMergeableQuoteItemIndex, quoteItemsShareVariantIdentity } from "@/hooks/quotes/quoteVariantIdentity";

const quoteItem = (overrides: Record<string, string | null | undefined> = {}) => ({
  product_id: "produto-1",
  color_name: "Verde",
  size_code: "M",
  source_variant_id: "variante-1",
  source_variant_sku: "SKU-1",
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
    const existing = quoteItem({ unit_price: "10" });
    const sameVariant = quoteItem({ unit_price: "10" });
    const otherVariant = quoteItem({ source_variant_id: "variante-2", source_variant_sku: "SKU-2", unit_price: "15" });

    expect(findMergeableQuoteItemIndex([existing], sameVariant)).toBe(0);
    expect(findMergeableQuoteItemIndex([existing], otherVariant)).toBe(-1);
  });
});
