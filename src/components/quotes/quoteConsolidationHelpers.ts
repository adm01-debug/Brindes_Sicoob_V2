import type { Quote, QuoteItem } from "@/hooks/quotes/quoteTypes";

export interface ConsolidatedItemSource {
  key: string;
  number?: string;
  client?: string;
  quantity: number;
  total_value: number;
}

export interface ConsolidatedQuoteItem {
  key: string;
  product_name: string;
  product_sku?: string;
  total_quantity: number;
  average_price: number;
  total_value: number;
  sources: ConsolidatedItemSource[];
}

export type ConsolidationSortKey = "product_name" | "total_quantity" | "average_price" | "total_value";
export type ConsolidationSortConfig = { key: ConsolidationSortKey; direction: "asc" | "desc" } | null;

export function getConsolidationItemKey(item: QuoteItem): string {
  if (item.product_sku) return `sku:${item.product_sku}`;
  if (item.product_id) return `product:${item.product_id}`;
  return `name:${item.product_name}`;
}

function matchesSearch(item: QuoteItem, searchTerm: string): boolean {
  const search = searchTerm.trim().toLocaleLowerCase("pt-BR");
  if (!search) return true;
  return item.product_name.toLocaleLowerCase("pt-BR").includes(search) ||
    item.product_sku?.toLocaleLowerCase("pt-BR").includes(search) === true;
}

function sourceKey(quote: Quote, index: number): string {
  return quote.id ?? quote.quote_number ?? `quote-index:${index}`;
}

function addQuoteItem(grouped: Map<string, ConsolidatedQuoteItem>, quote: Quote, quoteIndex: number, item: QuoteItem): void {
  const key = getConsolidationItemKey(item);
  const quantity = item.quantity || 0;
  const totalValue = quantity * (item.unit_price || 0);
  const currentSourceKey = sourceKey(quote, quoteIndex);
  const existing = grouped.get(key);
  if (!existing) {
    grouped.set(key, {
      key, product_name: item.product_name, product_sku: item.product_sku, total_quantity: quantity,
      average_price: item.unit_price || 0, total_value: totalValue,
      sources: [{ key: currentSourceKey, number: quote.quote_number, client: quote.client_name || quote.client_company, quantity, total_value: totalValue }],
    });
    return;
  }
  existing.total_quantity += quantity;
  existing.total_value += totalValue;
  existing.average_price = existing.total_quantity ? existing.total_value / existing.total_quantity : 0;
  const existingSource = existing.sources.find((source) => source.key === currentSourceKey);
  if (existingSource) {
    existingSource.quantity += quantity;
    existingSource.total_value += totalValue;
    return;
  }
  existing.sources.push({ key: currentSourceKey, number: quote.quote_number, client: quote.client_name || quote.client_company, quantity, total_value: totalValue });
}

export function consolidateQuoteItems(
  quotes: Quote[],
  searchTerm: string,
  sortConfig: ConsolidationSortConfig,
): ConsolidatedQuoteItem[] {
  const grouped = new Map<string, ConsolidatedQuoteItem>();

  quotes.forEach((quote, quoteIndex) => {
    quote.items?.forEach((item) => {
      if (!matchesSearch(item, searchTerm)) return;
      addQuoteItem(grouped, quote, quoteIndex, item);
    });
  });

  return [...grouped.values()].sort((left, right) => {
    if (!sortConfig) return 0;
    const fallback = sortConfig.key === "product_name" ? "" : 0;
    const leftValue = left[sortConfig.key] ?? fallback;
    const rightValue = right[sortConfig.key] ?? fallback;
    if (leftValue < rightValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (leftValue > rightValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
}

/** Serializa uma célula com escape RFC 4180 e bloqueia fórmulas no Excel. */
export function toSafeCsvCell(value: string | number): string {
  const text = String(value);
  const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replace(/"/g, '""')}"`;
}
