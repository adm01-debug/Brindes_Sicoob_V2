import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
import type { QuoteItem } from "@/hooks/quotes/quoteTypes";

/** Mantém a identidade da variação usada no orçamento para estoque e integrações. */
export function getQuoteItemVariantIdentity(variant: ExternalVariantStock | null) {
  return {
    source_variant_id: variant?.id ?? null,
    source_variant_sku: variant?.supplier_sku ?? variant?.sku ?? null,
  };
}

/** Evita consolidar linhas que apontam para SKUs distintos do catálogo externo. */
export function quoteItemsShareVariantIdentity(
  first: Pick<QuoteItem, "source_variant_id" | "source_variant_sku">,
  second: Pick<QuoteItem, "source_variant_id" | "source_variant_sku">,
): boolean {
  return (first.source_variant_id ?? null) === (second.source_variant_id ?? null)
    && (first.source_variant_sku ?? null) === (second.source_variant_sku ?? null);
}

export function findMergeableQuoteItemIndex(
  items: readonly Pick<
    QuoteItem,
    "product_id" | "color_name" | "size_code" | "source_variant_id" | "source_variant_sku" | "unit_price" | "unit_cost"
  >[],
  candidate: Pick<
    QuoteItem,
    "product_id" | "color_name" | "size_code" | "source_variant_id" | "source_variant_sku" | "unit_price" | "unit_cost"
  >,
): number {
  return items.findIndex(item =>
    item.product_id === candidate.product_id
    && item.color_name === candidate.color_name
    && item.size_code === candidate.size_code
    && quoteItemsShareVariantIdentity(item, candidate)
    && item.unit_price === candidate.unit_price
    && (item.unit_cost ?? 0) === (candidate.unit_cost ?? 0),
  );
}
