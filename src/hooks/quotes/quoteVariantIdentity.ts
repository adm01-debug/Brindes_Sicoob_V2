import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";

/** Mantém a identidade da variação usada no orçamento para estoque e integrações. */
export function getQuoteItemVariantIdentity(variant: ExternalVariantStock | null) {
  return {
    source_variant_id: variant?.id ?? null,
    source_variant_sku: variant?.supplier_sku ?? variant?.sku ?? null,
  };
}
