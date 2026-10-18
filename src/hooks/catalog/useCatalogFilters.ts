import { useMemo, useState } from "react";
import { defaultFilters, type FilterState } from "@/components/filters/FilterPanel";

export function countActiveFilters(filters: FilterState): number {
  const listCount = [
    filters.colors, filters.colorGroups, filters.colorVariations, filters.colorNuances,
    filters.categories, filters.suppliers, filters.publicoAlvo, filters.datasComemorativas,
    filters.endomarketing, filters.sicoobThemes, filters.ramosAtividade, filters.segmentosAtividade,
    filters.materialGroups, filters.materialTypes, filters.materiais, filters.gender,
    filters.tags, filters.techniques, filters.sizes,
  ].reduce((total, values) => total + (values?.length ?? 0), 0);
  const priceRangeActive = filters.priceRange[0] > 0 || filters.priceRange[1] < 9999;
  const flags = [priceRangeActive, filters.minStock > 0, filters.inStock, filters.isKit,
    (filters.minQuantity ?? 0) > 0, filters.featured, filters.isNew, filters.hasPersonalization,
    filters.hasCommercialPackaging, Boolean(filters.search)];
  return listCount + flags.filter(Boolean).length;
}

export function useCatalogFilters() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);

  return {
    filters,
    setFilters,
    filterSheetOpen,
    setFilterSheetOpen,
    activeFiltersCount,
  };
}
