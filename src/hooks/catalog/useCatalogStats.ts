import React, { useMemo } from "react";
import { Package, Heart, Users, FolderTree, Palette } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import type { CatalogRealStats } from "@/hooks/useCatalogRealStats";

interface UseCatalogStatsProps {
  filteredProducts: Product[];
  totalEstimate: number | null;
  activeFiltersCount: number;
  searchQuery: string;
  hasNextPage: boolean | undefined;
  realStats: CatalogRealStats | undefined;
  isFavorite: (id: string) => boolean;
  favoriteCount: number;
}

function uniqueProducts(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter(product => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function countVariants(products: Product[]): number {
  return products.reduce((sum, product) => {
    const colorCount = product.colors?.length || 0;
    const variationCount = !colorCount && product.variations?.length ? product.variations.length : 0;
    return sum + colorCount + variationCount;
  }, 0);
}

function localCatalogStats(products: Product[], isFavorite: (id: string) => boolean, favoriteCount: number) {
  const deduped = uniqueProducts(products);
  const categoryIds = new Set(deduped.map(product => product.category_id || (product.category?.id ? String(product.category.id) : "")).filter(Boolean));
  const suppliers = new Set(deduped.map(product => product.supplier?.name?.trim().toLowerCase()).filter(name => name && name !== "sem fornecedor"));
  return [
    { id: "products", label: "Catálogo Sicoob", value: deduped.length, icon: React.createElement(Package, { className: "h-4 w-4" }) },
    { id: "variants", label: "Variações Ativas", value: countVariants(deduped), icon: React.createElement(Palette, { className: "h-4 w-4" }) },
    { id: "categories", label: "Nichos", value: categoryIds.size, icon: React.createElement(FolderTree, { className: "h-4 w-4" }) },
    { id: "suppliers", label: "Homologados", value: suppliers.size, icon: React.createElement(Users, { className: "h-4 w-4" }) },
    { id: "favorites", label: "Meus Favoritos", value: isFavorite ? deduped.filter(product => isFavorite(product.id)).length : favoriteCount, icon: React.createElement(Heart, { className: "h-4 w-4" }) },
  ];
}

export function useCatalogStats({
  filteredProducts,
  totalEstimate,
  activeFiltersCount,
  searchQuery,
  realStats,
  isFavorite,
  favoriteCount,
}: UseCatalogStatsProps) {
  return useMemo(() => {
    const queryTrimmed = searchQuery.trim();
    const hasActiveFilters = activeFiltersCount > 0 || queryTrimmed.length > 0;

    // Faster check for product count when no search is active
    if (!hasActiveFilters && totalEstimate !== null) {
      return [
        { id: "products", label: "Catálogo Sicoob", value: totalEstimate, icon: React.createElement(Package, { className: "h-4 w-4" }) },
        { id: "variants", label: "Variações Ativas", value: realStats?.totalVariants || 0, icon: React.createElement(Palette, { className: "h-4 w-4" }) },
        { id: "categories", label: "Nichos", value: realStats?.totalCategories || 0, icon: React.createElement(FolderTree, { className: "h-4 w-4" }) },
        { id: "suppliers", label: "Homologados", value: realStats?.totalSuppliers || 0, icon: React.createElement(Users, { className: "h-4 w-4" }) },
        { id: "favorites", label: "Meus Favoritos", value: favoriteCount, icon: React.createElement(Heart, { className: "h-4 w-4" }) },
      ];
    }

    return localCatalogStats(filteredProducts, isFavorite, favoriteCount);
  }, [filteredProducts, favoriteCount, isFavorite, activeFiltersCount, searchQuery, totalEstimate, realStats]);
}
