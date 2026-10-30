import type { Product } from "@/hooks/useProducts";
import type { SupplierSalesEntry } from "@/hooks/useSupplierSalesRanking";

interface SortOptions {
  promoSalesMap?: Map<string, number>;
  supplierSalesMap?: Map<string, SupplierSalesEntry>;
  skipSort?: boolean;
}

type ProductComparator = (first: Product, second: Product) => number;

function creationTime(product: Product): number {
  if (!product.created_at) return 0;
  return typeof product.created_at === 'number' ? product.created_at : new Date(product.created_at).getTime();
}

const BASIC_COMPARATORS: Record<string, ProductComparator> = {
  name: (first, second) => first.name.localeCompare(second.name),
  'price-asc': (first, second) => first.price - second.price,
  'price-desc': (first, second) => second.price - first.price,
  stock: (first, second) => (second.stock || 0) - (first.stock || 0),
  newest: (first, second) => creationTime(second) - creationTime(first),
};

function fallbackSalesScore(product: Product): number {
  return Number(product.featured) * 2 + Number(product.newArrival);
}

function productStock(product: Product): number {
  return product.stock || 0;
}

function supplierMetrics(map: Map<string, SupplierSalesEntry>, productId: string): { score: number; velocity: number } {
  const entry = map.get(productId);
  return { score: entry?.turnoverScore ?? 0, velocity: entry?.velocity7d ?? 0 };
}

function supplierSalesComparator(map?: Map<string, SupplierSalesEntry>): ProductComparator {
  if (!map?.size) {
    return (first, second) => {
      const firstScore = fallbackSalesScore(first);
      const secondScore = fallbackSalesScore(second);
      return secondScore !== firstScore ? secondScore - firstScore : productStock(second) - productStock(first);
    };
  }
  return (first, second) => {
    const firstMetrics = supplierMetrics(map, first.id);
    const secondMetrics = supplierMetrics(map, second.id);
    const scoreDifference = secondMetrics.score - firstMetrics.score;
    if (scoreDifference !== 0) return scoreDifference;
    const velocityDifference = secondMetrics.velocity - firstMetrics.velocity;
    return velocityDifference !== 0 ? velocityDifference : first.name.localeCompare(second.name);
  };
}

function promoSalesComparator(map?: Map<string, number>): ProductComparator {
  return (first, second) => {
    const difference = (map?.get(second.id) || 0) - (map?.get(first.id) || 0);
    return difference !== 0 ? difference : first.name.localeCompare(second.name);
  };
}

function productComparator(sortBy: string, options?: SortOptions): ProductComparator | undefined {
  if (sortBy === 'best-seller-supplier') return supplierSalesComparator(options?.supplierSalesMap);
  if (sortBy === 'best-seller-promo') return promoSalesComparator(options?.promoSalesMap);
  return BASIC_COMPARATORS[sortBy];
}

/**
 * Centralized product sorting logic.
 * Used by both the Catalog (Index) and Super Filter (FiltersPage).
 */
export function sortProducts(
  products: Product[],
  sortBy: string,
  options?: SortOptions,
): Product[] {
  if (options?.skipSort) return products;
  const comparator = productComparator(sortBy, options);
  if (comparator) products.sort(comparator);
  return products;
}
