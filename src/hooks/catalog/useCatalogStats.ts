import { useMemo } from "react";
import React from "react";
import { Package, Heart, Users, FolderTree, Palette } from "lucide-react";
import type { Product } from "@/hooks/useProducts";

interface UseCatalogStatsProps {
  filteredProducts: Product[];
  totalEstimate: number | null;
  activeFiltersCount: number;
  searchQuery: string;
  hasNextPage: boolean | undefined;
  realStats: any;
  isFavorite: (id: string) => boolean;
  favoriteCount: number;
}

export function useCatalogStats({
  filteredProducts,
  totalEstimate,
  activeFiltersCount,
  searchQuery,
  hasNextPage,
  realStats,
  isFavorite,
  favoriteCount,
}: UseCatalogStatsProps) {
  return useMemo(() => {
    const hasActiveFilters = activeFiltersCount > 0 || searchQuery.trim().length > 0;

    // Deduplicate products by ID
    const seen = new Set<string>();
    const deduped = filteredProducts.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const productCount = hasActiveFilters
      ? deduped.length
      : (totalEstimate || deduped.length);

    const localVariants = deduped.reduce((sum, p) => {
      const colorCount = p.colors?.filter((c: any) => c.name?.trim()).length || 0;
      const variationCount = !colorCount && p.variations?.length ? p.variations.length : 0;
      return sum + colorCount + variationCount;
    }, 0);
    const totalVariants = hasActiveFilters
      ? localVariants
      : (realStats?.totalVariants ?? localVariants);

    const uniqueCategoryIds = new Set(
      deduped
        .map((p) => p.category_id || (p.category?.id ? String(p.category.id) : ""))
        .filter((id) => id && id !== "0")
    );
    const categoriesCount = hasActiveFilters
      ? uniqueCategoryIds.size
      : (realStats?.totalCategories ?? uniqueCategoryIds.size);

    const uniqueSuppliers = new Set(
      deduped
        .map((p) => p.supplier?.name?.trim().toLowerCase())
        .filter((n): n is string => !!n && n !== "sem fornecedor")
    );
    const suppliersCount = hasActiveFilters
      ? uniqueSuppliers.size
      : (realStats?.totalSuppliers ?? uniqueSuppliers.size);

    const contextualFavoriteCount = isFavorite
      ? deduped.filter((p) => isFavorite(p.id)).length
      : favoriteCount;

    return [
      { id: "products", label: "Produtos Únicos", value: productCount, icon: React.createElement(Package, { className: "h-4 w-4" }) },
      { id: "variants", label: "Variações", value: totalVariants, icon: React.createElement(Palette, { className: "h-4 w-4" }) },
      { id: "categories", label: "Categorias", value: categoriesCount, icon: React.createElement(FolderTree, { className: "h-4 w-4" }) },
      { id: "suppliers", label: "Fornecedores", value: suppliersCount, icon: React.createElement(Users, { className: "h-4 w-4" }) },
      { id: "favorites", label: "Favoritos", value: contextualFavoriteCount, icon: React.createElement(Heart, { className: "h-4 w-4" }) },
    ];
  }, [filteredProducts, favoriteCount, isFavorite, activeFiltersCount, searchQuery, totalEstimate, hasNextPage, realStats]);
}
