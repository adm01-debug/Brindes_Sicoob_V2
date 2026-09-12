/** Campos comerciais internos que nunca saem do BFF do portal de compras. */
export const INTERNAL_CATALOG_FIELDS = new Set([
  "cost_price",
  "purchase_price",
  "supplier_cost",
  "internal_cost",
  "unit_cost",
  "setup_cost",
  "total_cost",
  "base_cost",
  "production_cost",
  "handling_cost",
  "freight_cost",
  "gross_margin",
  "net_margin",
  "margin_percentage",
  "markup_percentage",
  "markup_percent",
  "supplier",
  "supplier_id",
  "supplier_name",
]);

const INTERNAL_FIELD_PATTERN = /(^|_)(cost|custo|margin|margem|markup|supplier|fornecedor|purchase|acquisition|internal)($|_)/i;

/** Remove campos internos de estruturas JSON, inclusive em relações aninhadas. */
export function redactInternalCatalogFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactInternalCatalogFields);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !INTERNAL_CATALOG_FIELDS.has(key) && !INTERNAL_FIELD_PATTERN.test(key))
      .map(([key, child]) => [key, redactInternalCatalogFields(child)]),
  );
}
