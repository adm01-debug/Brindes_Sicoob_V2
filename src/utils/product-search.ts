import type { default as Fuse, IFuseOptions } from "fuse.js";

export interface SearchableProductLike {
  id: string;
  name: string;
  sku?: string | null;
  supplier_reference?: string | null;
  brand?: string | null;
  category_name?: string | null;
  description?: string | null;
}

const DEFAULT_FUSE_OPTIONS = {
  keys: [
    { name: "sku", weight: 0.35 },
    { name: "name", weight: 0.3 },
    { name: "supplier_reference", weight: 0.1 },
    { name: "brand", weight: 0.08 },
    { name: "category_name", weight: 0.07 },
    { name: "description", weight: 0.05 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
  findAllMatches: true,
  useExtendedSearch: false,
} satisfies IFuseOptions<SearchableProductLike>;

export function normalizeProductSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function createProductFuseOptions<T extends SearchableProductLike>(
  overrides: Partial<IFuseOptions<T>> = {}
): IFuseOptions<T> {
  return {
    ...DEFAULT_FUSE_OPTIONS,
    keys: DEFAULT_FUSE_OPTIONS.keys as IFuseOptions<T>["keys"],
    ...overrides,
  };
}

function getNormalizedValue(value: unknown): string {
  return typeof value === "string" ? normalizeProductSearch(value) : "";
}

function getBestFieldPosition<T extends SearchableProductLike>(product: T, query: string) {
  const fields = [
    product.name,
    product.sku,
    product.supplier_reference,
    product.brand,
    product.category_name,
    product.description,
  ];

  return fields.reduce((best, field) => {
    const position = getNormalizedValue(field).indexOf(query);
    if (position === -1) return best;
    return Math.min(best, position);
  }, Number.POSITIVE_INFINITY);
}

function sortByRelevancePosition<T extends SearchableProductLike>(items: T[], query: string) {
  return items.sort((a, b) => getBestFieldPosition(a, query) - getBestFieldPosition(b, query));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface SearchBuckets<T> {
  nameExact: T[];
  nameStartsWith: T[];
  nameExactWord: T[];
  nameContains: T[];
  codeStartsWith: T[];
  codeContains: T[];
  metadataContains: T[];
}

type BucketName = keyof SearchBuckets<unknown>;

function emptyBuckets<T>(): SearchBuckets<T> {
  return { nameExact: [], nameStartsWith: [], nameExactWord: [], nameContains: [], codeStartsWith: [], codeContains: [], metadataContains: [] };
}

function codeMatchesStart(sku: string, reference: string, query: string): boolean {
  return sku.startsWith(query) || reference.startsWith(query);
}

function codeIncludes(sku: string, reference: string, query: string): boolean {
  return sku.includes(query) || reference.includes(query);
}

function metadataIncludes(product: SearchableProductLike, query: string): boolean {
  return [product.brand, product.category_name, product.description].some(value => getNormalizedValue(value).includes(query));
}

function productBucket(product: SearchableProductLike, query: string, wordBoundary: RegExp): BucketName | null {
  const name = getNormalizedValue(product.name);
  const sku = getNormalizedValue(product.sku);
  const reference = getNormalizedValue(product.supplier_reference);
  if (name === query) return 'nameExact';
  if (name.startsWith(query)) return 'nameStartsWith';
  if (wordBoundary.test(name)) return 'nameExactWord';
  if (name.includes(query)) return 'nameContains';
  if (codeMatchesStart(sku, reference, query)) return 'codeStartsWith';
  if (codeIncludes(sku, reference, query)) return 'codeContains';
  return metadataIncludes(product, query) ? 'metadataContains' : null;
}

function classifyProducts<T extends SearchableProductLike>(products: T[], query: string): SearchBuckets<T> {
  const buckets = emptyBuckets<T>();
  const wordBoundary = new RegExp(`\\b${escapeRegExp(query)}\\b`, "i");
  for (const product of products) {
    const bucket = productBucket(product, query, wordBoundary);
    if (bucket) buckets[bucket].push(product);
  }
  return buckets;
}

function exactCodeMatches<T extends SearchableProductLike>(products: T[], query: string): T[] {
  return products.filter(product => [product.sku, product.supplier_reference].some(value => getNormalizedValue(value) === query));
}

function fuzzyMatches<T extends SearchableProductLike>(fuse: Fuse<T> | undefined, query: string, threshold: number): T[] {
  if (!fuse) return [];
  return fuse.search(query).filter(result => (result.score ?? 1) < threshold).map(result => result.item);
}

function limited<T>(products: T[], limit?: number): T[] {
  return typeof limit === "number" ? products.slice(0, limit) : products;
}

function combineBuckets<T extends SearchableProductLike>(buckets: SearchBuckets<T>, query: string, fuzzyItems: T[]): T[] {
  return dedupeById([
    ...sortByRelevancePosition(buckets.nameExact, query),
    ...sortByRelevancePosition(buckets.nameStartsWith, query),
    ...sortByRelevancePosition(buckets.nameExactWord, query),
    ...sortByRelevancePosition(buckets.nameContains, query),
    ...sortByRelevancePosition(buckets.codeStartsWith, query),
    ...sortByRelevancePosition(buckets.codeContains, query),
    ...sortByRelevancePosition(buckets.metadataContains, query),
    ...fuzzyItems,
  ]);
}

/**
 * Classifica produtos por relevância ao termo de busca.
 *
 * ⚠️ REGRA DE NEGÓCIO — NÃO ALTERAR A HIERARQUIA DE PRIORIDADE:
 *   1. SKU / Referência exata (match perfeito)
 *   2. Nome exato
 *   3. Nome começa com o termo  ("Caneta Plástica" para busca "caneta")
 *   4. Palavra exata no nome    ("Porta Caneta" — word boundary)
 *   5. Nome contém o termo
 *   6. Código (SKU/ref) começa com / contém
 *   7. Metadados (marca, categoria, descrição)
 *   8. Fuzzy via Fuse.js (score < fuzzyThreshold)
 *
 * Dentro de cada grupo, itens são sub-ordenados pela posição do match
 * mais à esquerda nos campos do produto (sortByRelevancePosition).
 *
 * Esta ordem é preservada no catálogo quando o sort padrão "Nome A-Z"
 * está ativo (ver useCatalogState.ts → skipSort).
 */
export function rankProductSearchResults<T extends SearchableProductLike>(
  products: T[],
  searchQuery: string,
  fuse?: Fuse<T>,
  options: {
    limit?: number;
    fuzzyThreshold?: number;
  } = {}
): T[] {
  const normalizedQuery = normalizeProductSearch(searchQuery);
  const limit = options.limit;
  const fuzzyThreshold = options.fuzzyThreshold ?? 0.45;

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return limited(products, limit);
  }

  const exactMatches = exactCodeMatches(products, normalizedQuery);
  if (exactMatches.length > 0) return limited(exactMatches, limit);
  const buckets = classifyProducts(products, normalizedQuery);
  const combined = combineBuckets(buckets, normalizedQuery, fuzzyMatches(fuse, searchQuery, fuzzyThreshold));
  return limited(combined, limit);
}
