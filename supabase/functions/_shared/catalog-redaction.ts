/** Campos comerciais internos que nunca saem do BFF do portal de compras. */
export const INTERNAL_CATALOG_FIELDS = new Set([
  "cost_price",
  "purchase_price",
  "supplier_cost",
  "internal_cost",
  "gross_margin",
  "markup_percentage",
]);

/** Remove campos internos de estruturas JSON, inclusive em relações aninhadas. */
export function redactInternalCatalogFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactInternalCatalogFields);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !INTERNAL_CATALOG_FIELDS.has(key))
      .map(([key, child]) => [key, redactInternalCatalogFields(child)]),
  );
}
