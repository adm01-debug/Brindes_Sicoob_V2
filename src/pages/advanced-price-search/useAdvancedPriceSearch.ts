import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useExternalTechniques } from '@/hooks/useExternalDatabase';
import { useProducts, type Product } from '@/hooks/useProducts';
import { fetchPromobrindPriceTables } from '@/lib/external-db';
import {
  DEFAULT_FILTERS,
  type ProductWithCalculatedPrice,
  type SearchFilters,
  type ViewMode,
} from './types';

type PriceTable = Awaited<ReturnType<typeof fetchPromobrindPriceTables>>[number];

function productCategory(product: Product) {
  if (typeof product.category === 'string') return product.category;
  if (typeof product.category === 'object') return product.category?.name ?? null;
  return null;
}

function collectCategories(products: Product[]) {
  const categories = new Set<string>();
  for (const product of products) {
    const category = productCategory(product);
    if (category) categories.add(category);
  }
  return Array.from(categories).sort();
}

function collectColors(products: Product[]) {
  const colors = new Map<string, { name: string; hex: string }>();
  for (const product of products) {
    for (const color of product.colors ?? []) {
      if (color.hex && !colors.has(color.hex)) {
        colors.set(color.hex, { name: color.name, hex: color.hex });
      }
    }
  }
  return Array.from(colors.values());
}

function matchesSearch(product: Product, searchQuery: string) {
  if (!searchQuery) return true;
  const query = searchQuery.toLowerCase();
  return (
    product.name.toLowerCase().includes(query) ||
    Boolean(product.sku?.toLowerCase().includes(query))
  );
}

function matchesCategory(product: Product, category: string) {
  return category === 'all' || productCategory(product) === category;
}

function matchesColors(product: Product, colors: string[]) {
  if (colors.length === 0) return true;
  const productColors = new Set((product.colors ?? []).map((color) => color.hex));
  return colors.some((color) => productColors.has(color));
}

function matchesFilters(product: Product, filters: SearchFilters) {
  return (
    matchesSearch(product, filters.searchQuery) &&
    matchesCategory(product, filters.category) &&
    matchesColors(product, filters.colors)
  );
}

function matchesQuantity(table: PriceTable, quantity: number) {
  if (table.min_quantity > quantity) return false;
  return table.max_quantity === null || table.max_quantity >= quantity;
}

function matchingPriceTable(filters: SearchFilters, priceTables: PriceTable[]) {
  if (filters.technique === 'all' || priceTables.length === 0) return undefined;
  return priceTables.find((table) => matchesQuantity(table, filters.minQuantity)) ?? priceTables[0];
}

function numberOrZero(value: number | null | undefined) {
  return value || 0;
}

function calculateProductPrice(
  product: Product,
  filters: SearchFilters,
  priceTables: PriceTable[],
): ProductWithCalculatedPrice {
  const table = matchingPriceTable(filters, priceTables);
  const productPrice = numberOrZero(product.price);
  const customizationPrice = numberOrZero(table?.unit_price);
  const setupPrice = numberOrZero(table?.setup_price);
  const handlingPrice = numberOrZero(table?.handling_price);
  const personalizedPrice =
    productPrice + customizationPrice + setupPrice / filters.minQuantity + handlingPrice;
  const totalPerUnit =
    filters.priceType === 'with_personalization' ? personalizedPrice : productPrice;
  return {
    ...product,
    calculatedUnitPrice: totalPerUnit,
    priceBreakdown: {
      productPrice,
      customizationPrice,
      setupPrice,
      handlingPrice,
      totalPerUnit,
    },
    matchingTechnique: table,
  };
}

function priceWithinRange(product: ProductWithCalculatedPrice, range: [number, number]) {
  const price = product.priceBreakdown.totalPerUnit;
  return price >= range[0] && price <= range[1];
}

function searchProducts(
  products: Product[],
  filters: SearchFilters,
  priceTables: PriceTable[],
  isSearching: boolean,
) {
  if (!isSearching) return [];
  return products
    .filter((product) => matchesFilters(product, filters))
    .map((product) => calculateProductPrice(product, filters, priceTables))
    .filter((product) => priceWithinRange(product, filters.priceRange))
    .sort((left, right) => left.priceBreakdown.totalPerUnit - right.priceBreakdown.totalPerUnit);
}

function usePriceTables(filters: SearchFilters) {
  return useQuery({
    queryKey: ['price-tables-search', filters.technique, filters.minQuantity],
    queryFn: () => {
      if (filters.technique === 'all') return Promise.resolve([]);
      return fetchPromobrindPriceTables({
        techniqueName: filters.technique,
        quantity: filters.minQuantity,
      });
    },
    enabled: filters.technique !== 'all',
  });
}

export function useAdvancedPriceSearch() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [isSearching, setIsSearching] = useState(false);
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: techniques = [], isLoading: loadingTechniques } = useExternalTechniques();
  const { data: priceTables = [] } = usePriceTables(filters);
  const categories = useMemo(() => collectCategories(products), [products]);
  const availableColors = useMemo(() => collectColors(products), [products]);
  const filteredProducts = useMemo(
    () => searchProducts(products, filters, priceTables, isSearching),
    [products, priceTables, filters, isSearching],
  );
  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setIsSearching(false);
  };
  const toggleColor = (hex: string) => {
    setFilters((previous) => ({
      ...previous,
      colors: previous.colors.includes(hex)
        ? previous.colors.filter((color) => color !== hex)
        : [...previous.colors, hex],
    }));
    setIsSearching(false);
  };
  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setIsSearching(false);
  };
  return {
    filters,
    viewMode,
    setViewMode,
    isSearching,
    setIsSearching,
    filteredProducts,
    categories,
    availableColors,
    techniques,
    isLoading: loadingProducts || loadingTechniques,
    loadingTechniques,
    updateFilter,
    toggleColor,
    handleSearch: () => setIsSearching(true),
    handleReset,
  };
}
