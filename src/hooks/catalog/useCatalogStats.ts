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

    // Deduplicate products by ID only if strictly needed
    const seen = new Set<string>();
    const deduped = filteredProducts.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const productCount = deduped.length;

    const localVariants = deduped.reduce((sum, p) => {
      const colorCount = p.colors?.length || 0;
      const variationCount = !colorCount && p.variations?.length ? p.variations.length : 0;
      return sum + colorCount + variationCount;
    }, 0);

    const uniqueCategoryIds = new Set(
      deduped.map((p) => p.category_id || (p.category?.id ? String(p.category.id) : "")).filter(Boolean)
    );

    const uniqueSuppliers = new Set(
      deduped.map((p) => p.supplier?.name?.trim().toLowerCase()).filter(n => n && n !== "sem fornecedor")
    );

    return [
      { id: "products", label: "Catálogo Sicoob", value: productCount, icon: React.createElement(Package, { className: "h-4 w-4" }) },
      { id: "variants", label: "Variações Ativas", value: localVariants, icon: React.createElement(Palette, { className: "h-4 w-4" }) },
      { id: "categories", label: "Nichos", value: uniqueCategoryIds.size, icon: React.createElement(FolderTree, { className: "h-4 w-4" }) },
      { id: "suppliers", label: "Homologados", value: uniqueSuppliers.size, icon: React.createElement(Users, { className: "h-4 w-4" }) },
      { id: "favorites", label: "Meus Favoritos", value: isFavorite ? deduped.filter(p => isFavorite(p.id)).length : favoriteCount, icon: React.createElement(Heart, { className: "h-4 w-4" }) },
    ];
  }, [filteredProducts, favoriteCount, isFavorite, activeFiltersCount, searchQuery, totalEstimate, hasNextPage, realStats]);
}