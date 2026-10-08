import { useMemo, useState } from "react";
import { defaultFilters, type FilterState } from "@/components/filters/FilterPanel";

function countActiveFilters(filters: FilterState): number {
  const listCount = [
    filters.colors, filters.colorGroups, filters.colorVariations, filters.colorNuances,
    filters.categories, filters.suppliers, filters.publicoAlvo, filters.datasComemorativas,
    filters.endomarketing, filters.ramosAtividade, filters.segmentosAtividade,
    filters.materialGroups, filters.materialTypes, filters.materiais, filters.gender,
  ].reduce((total, values) => total + (values?.length ?? 0), 0);
  const priceRangeActive = filters.priceRange[0] > 0 || filters.priceRange[1] < 500;
  return listCount + Number(priceRangeActive) + Number(filters.inStock) + Number(filters.isKit) + Number(filters.featured);
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
