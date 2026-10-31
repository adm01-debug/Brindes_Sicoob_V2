/**
 * useVariantStock — Hook de estoque por variante (refatorado)
 * Fetcher em stock/stockFetcher.ts, alertas em stock/stockAlerts.ts
 */
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type ProductStockSummary,
  type StockFilters,
  type StockDashboardSummary,
  type VariantStock,
  type StockAlertType,
  defaultStockFilters,
} from '@/types/stock';
import { fetchAndProcessStockData } from './stock/stockFetcher';

function countStatuses(productStocks: ProductStockSummary[]) {
  const products = { in_stock: 0, low_stock: 0, critical: 0, out_of_stock: 0 };
  const variants = { in_stock: 0, low_stock: 0, critical: 0, out_of_stock: 0 };
  let totalVariants = 0;
  let daysSum = 0;
  const colors = new Set<string>();
  for (const product of productStocks) {
    if (product.overallStatus in products) products[product.overallStatus as keyof typeof products] += 1;
    for (const variant of product.variants) {
      totalVariants += 1;
      if (variant.colorName) colors.add(variant.colorName);
      daysSum += variant.daysUntilStockout || 0;
      if (variant.status in variants) variants[variant.status as keyof typeof variants] += 1;
    }
  }
  return { products, variants, totalVariants, daysSum, colors };
}

function buildStockSummary(
  productStocks: ProductStockSummary[],
  alerts: Array<{ severity: string }>,
): StockDashboardSummary {
  const counts = countStatuses(productStocks);
  return {
    totalProducts: productStocks.length,
    totalVariants: counts.totalVariants,
    totalColors: counts.colors.size,
    productsInStock: counts.products.in_stock,
    productsLowStock: counts.products.low_stock,
    productsCritical: counts.products.critical,
    productsOutOfStock: counts.products.out_of_stock,
    variantsInStock: counts.variants.in_stock,
    variantsLowStock: counts.variants.low_stock,
    variantsCritical: counts.variants.critical,
    variantsOutOfStock: counts.variants.out_of_stock,
    totalStockValue: 0,
    totalAvailableValue: 0,
    averageDaysOfStock: counts.daysSum / Math.max(1, counts.totalVariants),
    stockTurnoverRate: 0,
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter((alert) => alert.severity === 'error').length,
    incomingStockValue: 0,
  };
}

function matchesStockStatus(product: ProductStockSummary, status: StockFilters['status']) {
  if (product.overallStatus === status) return true;
  if (status === 'low_stock' && product.overallStatus === 'critical') return true;
  if (status === 'incoming') {
    return product.totalInTransitStock > 0
      || product.variants.some((variant) => variant.status === 'incoming' || variant.inTransitStock > 0);
  }
  return product.variants.some((variant) => variant.status === status);
}

function matchesStockSearch(product: ProductStockSummary, search: string) {
  const query = search.toLowerCase();
  return product.productName.toLowerCase().includes(query)
    || product.productSku.toLowerCase().includes(query)
    || product.variants.some((variant) => (
      variant.colorName?.toLowerCase().includes(query) || variant.variantSku.toLowerCase().includes(query)
    ));
}

function filterStockProducts(
  products: ProductStockSummary[],
  filters: StockFilters,
  alertProductIds: Set<string>,
  restrictToAlerts: boolean,
) {
  let items = restrictToAlerts ? products.filter((p) => alertProductIds.has(p.productId)) : [...products];
  if (filters.status) items = items.filter((product) => matchesStockStatus(product, filters.status));
  if (filters.search) items = items.filter((product) => matchesStockSearch(product, filters.search));
  if (filters.categoryId) items = items.filter((product) => product.categoryName === filters.categoryId);
  if (filters.supplierId) items = items.filter((product) => product.supplierName === filters.supplierId);
  if (filters.colorName) {
    items = items.filter((product) => product.variants.some((variant) => variant.colorName === filters.colorName));
  }
  if (filters.colorGroup) {
    const group = filters.colorGroup.toLowerCase();
    items = items.filter((product) => product.variants.some((variant) => variant.colorName?.toLowerCase().includes(group)));
  }
  if (filters.minQuantityNeeded && filters.minQuantityNeeded > 0) {
    const minimumQuantity = filters.minQuantityNeeded;
    items = items.filter((product) => product.totalAvailableStock >= minimumQuantity);
  }
  return items;
}

function sortStockProducts(items: ProductStockSummary[], filters: StockFilters) {
  const direction = filters.sortDirection === 'asc' ? 1 : -1;
  switch (filters.sortBy) {
    case 'name': return items.sort((a, b) => a.productName.localeCompare(b.productName) * direction);
    case 'sku': return items.sort((a, b) => a.productSku.localeCompare(b.productSku) * direction);
    case 'stock_quantity': return items.sort((a, b) => (a.totalCurrentStock - b.totalCurrentStock) * direction);
    case 'available_stock': return items.sort((a, b) => (a.totalAvailableStock - b.totalAvailableStock) * direction);
    case 'days_remaining': return items.sort((a, b) => ((a.daysUntilFullStockout ?? 999) - (b.daysUntilFullStockout ?? 999)) * direction);
    default: return items;
  }
}

export function useVariantStock() {
  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [alertTypeFilter, setAlertTypeFilter] = useState<StockAlertType | 'all'>('all');
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['variant-stock-data'],
    queryFn: fetchAndProcessStockData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const productStocks = useMemo(() => data?.productStocks ?? [], [data?.productStocks]);
  const rawAlerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);
  const futureStock = useMemo(() => data?.futureStock ?? [], [data?.futureStock]);

  const alerts = useMemo(() => {
    if (dismissedAlerts.size === 0) return rawAlerts;
    return rawAlerts.filter(a => !dismissedAlerts.has(a.id));
  }, [rawAlerts, dismissedAlerts]);

  const loadingProgress = useMemo(() => {
    if (isLoading) return { step: 'Carregando dados em paralelo...', current: 0, total: 3 };
    return { step: '', current: 3, total: 3 };
  }, [isLoading]);

  const fetchStockData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['variant-stock-data'] });
  }, [queryClient]);

  const summary = useMemo(() => buildStockSummary(productStocks, alerts), [productStocks, alerts]);

  // Extract unique categories and suppliers for filter dropdowns
  const availableCategories = useMemo(() => {
    const map = new Map<string, number>();
    productStocks.forEach(p => {
      const cat = p.categoryName || 'Sem categoria';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productStocks]);

  const availableSuppliers = useMemo(() => {
    const map = new Map<string, number>();
    productStocks.forEach(p => {
      const sup = p.supplierName || 'Sem fornecedor';
      map.set(sup, (map.get(sup) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productStocks]);

  const availableColorGroups = useMemo(() => {
    const map = new Map<string, number>();
    productStocks.forEach(p => {
      p.variants.forEach(v => {
        if (v.colorName && v.colorName !== 'Padrão') {
          map.set(v.colorName, (map.get(v.colorName) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [productStocks]);

  const availableAlertTypes = useMemo(() => {
    const map = new Map<string, number>();
    rawAlerts.forEach(a => {
      map.set(a.type, (map.get(a.type) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawAlerts]);

  const filteredProducts = useMemo(() => {
    const activeAlerts = alertTypeFilter === 'all' 
      ? alerts 
      : alerts.filter(a => a.type === alertTypeFilter);
    const activeAlertProductIds = new Set(activeAlerts.map(a => a.productId));
    const restrictToAlerts = filters.showOnlyWithAlerts || alertTypeFilter !== 'all';
    return sortStockProducts(
      filterStockProducts(productStocks, filters, activeAlertProductIds, restrictToAlerts),
      filters,
    );
  }, [productStocks, filters, alerts, alertTypeFilter]);

  const allColors = useMemo(() => {
    const s = new Set<string>();
    productStocks.forEach(p => p.variants.forEach(v => { if (v.colorName) s.add(v.colorName); }));
    return Array.from(s).sort();
  }, [productStocks]);

  const criticalAlerts = useMemo(() => alerts.filter(a => a.severity === 'error'), [alerts]);

  const updateFilter = useCallback(<K extends keyof StockFilters>(key: K, value: StockFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultStockFilters), []);

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  }, []);

  const dismissAllAlerts = useCallback(() => {
    setDismissedAlerts(new Set(rawAlerts.map(a => a.id)));
  }, [rawAlerts]);

  const dismissAlertsBySeverity = useCallback((severity: 'error' | 'warning' | 'info') => {
    setDismissedAlerts(prev => {
      const next = new Set(prev);
      rawAlerts.filter(a => a.severity === severity).forEach(a => next.add(a.id));
      return next;
    });
  }, [rawAlerts]);

  const getProductStock = useCallback((productId: string): ProductStockSummary | undefined => {
    return productStocks.find(p => p.productId === productId);
  }, [productStocks]);

  const getColorStock = useCallback((productId: string, colorName: string): VariantStock[] => {
    const product = productStocks.find(p => p.productId === productId);
    return product?.variants.filter(v => v.colorName === colorName) || [];
  }, [productStocks]);

  return {
    isLoading, isFetching, loadingProgress,
    productStocks: filteredProducts, allProductStocks: productStocks,
    summary, alerts, criticalAlerts, futureStock, filters, allColors,
    availableCategories, availableSuppliers, availableColorGroups, availableAlertTypes,
    fetchStockData, updateFilter, resetFilters, dismissAlert,
    dismissAllAlerts, dismissAlertsBySeverity, setFilters,
    getProductStock, getColorStock,
    alertTypeFilter, setAlertTypeFilter,
  };
}

export function useProductVariantStock(productId: string) {
  const { alerts, isLoading, fetchStockData, allProductStocks } = useVariantStock();

  const productStock = useMemo(() => allProductStocks.find(p => p.productId === productId), [allProductStocks, productId]);
  const productAlerts = useMemo(() => alerts.filter(a => a.productId === productId), [alerts, productId]);

  return {
    isLoading,
    productStock,
    variants: productStock?.variants || [],
    colors: productStock?.availableColors || [],
    alerts: productAlerts,
    refresh: fetchStockData,
  };
}
