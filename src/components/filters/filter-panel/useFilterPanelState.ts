import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useCategoryIcons } from "@/hooks/useCategoryIcons";
import { useMaterialFilter } from "@/hooks/useMaterialFilter";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useRamoAtividadeFilter } from "@/hooks/useRamoAtividadeFilter";
import { useAdvancedFilters, SORT_OPTIONS } from "@/hooks/useAdvancedFilters";
import type { FilterState, FilterPanelProps } from "./types";

type Products = FilterPanelProps["products"];
type MaterialState = ReturnType<typeof useMaterialFilter>;

function usePanelSearchState(filters: FilterState, onFilterChange: FilterPanelProps["onFilterChange"]) {
  const [materialSearch, setMaterialSearch] = useState('');
  const [ramoSearch, setRamoSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [techniqueSearch, setTechniqueSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [publicoSearch, setPublicoSearch] = useState('');
  const [endoSearch, setEndoSearch] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debouncedSearch = useDebounce(localSearch, 500);
  useEffect(() => {
    if (debouncedSearch !== filters.search) onFilterChange({ ...filters, search: debouncedSearch });
  }, [debouncedSearch, filters, onFilterChange]);
  useEffect(() => {
    if (filters.search === '' && localSearch !== '') setLocalSearch('');
  }, [filters.search, localSearch]);
  return { materialSearch, setMaterialSearch, ramoSearch, setRamoSearch, supplierSearch, setSupplierSearch,
    techniqueSearch, setTechniqueSearch, tagSearch, setTagSearch, publicoSearch, setPublicoSearch,
    endoSearch, setEndoSearch, filterSearch, setFilterSearch, localSearch, setLocalSearch };
}

type SearchState = ReturnType<typeof usePanelSearchState>;

function sortedTags(products: Products, key: "publicoAlvo" | "endomarketing") {
  const values = new Set<string>();
  for (const product of products ?? []) for (const value of product.tags?.[key] ?? []) values.add(value);
  return [...values].sort((first, second) => first.localeCompare(second));
}

function incrementCount(counts: Map<string, number>, value: string) {
  const key = value.toLowerCase();
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function countRamos(products: Products) {
  const ramoCounts = new Map<string, number>();
  const segmentoCounts = new Map<string, number>();
  for (const product of products ?? []) {
    for (const ramo of product.tags?.ramo ?? []) incrementCount(ramoCounts, ramo);
    for (const nicho of product.tags?.nicho ?? []) incrementCount(segmentoCounts, nicho);
  }
  return { ramoCounts, segmentoCounts };
}

function useProductOptions(products: Products) {
  const publicoAlvoOptions = useMemo(() => sortedTags(products, "publicoAlvo"), [products]);
  const endomarketingOptions = useMemo(() => sortedTags(products, "endomarketing"), [products]);
  const productCountsByRamo = useMemo(() => countRamos(products), [products]);
  return { publicoAlvoOptions, endomarketingOptions, productCountsByRamo };
}

function selectedMaterialSections(groups: string[], types: string[], materials: MaterialState["materials"]) {
  const sections = new Set(groups.map(slug => `mat-${slug}`));
  for (const typeSlug of types) {
    const item = materials.find(candidate => candidate.type_slug === typeSlug);
    if (item) sections.add(`mat-${item.group_slug}`);
  }
  return sections;
}

function useOpenSections(material: MaterialState) {
  const [openSections, setOpenSections] = useState<string[]>([]);
  const selected = useMemo(() => selectedMaterialSections(material.filterState.selectedGroups, material.filterState.selectedTypes, material.materials),
    [material.filterState.selectedGroups, material.filterState.selectedTypes, material.materials]);
  useEffect(() => {
    if (material.groups.length === 0) return;
    if (selected.size === 0) return;
    setOpenSections(previous => [...new Set([...previous, ...selected])]);
  }, [material.groups.length, selected]);
  const toggleSection = useCallback((section: string) => setOpenSections(previous => previous.includes(section) ? previous.filter(item => item !== section) : [...previous, section]), []);
  const collapseAllSections = useCallback(() => setOpenSections([]), []);
  return { openSections, toggleSection, collapseAllSections };
}

function sorted(values: string[] | undefined) { return [...(values ?? [])].sort(); }
function sameValues(first: string[], second: string[]) { return JSON.stringify(sorted(first)) === JSON.stringify(sorted(second)); }
function filterValues(values: string[] | undefined) { return values ?? []; }
function materialChanged(groups: string[], types: string[], selectedGroups: string[], selectedTypes: string[]) {
  return !sameValues(groups, selectedGroups) || !sameValues(types, selectedTypes);
}
function externallyReset(groups: string[], types: string[], previous: { groups: string[]; types: string[] }) {
  return groups.length === 0 && types.length === 0 && (previous.groups.length > 0 || previous.types.length > 0);
}
function hasMaterialSelection(groups: string[], types: string[]) { return groups.length > 0 || types.length > 0; }

function useMaterialBridge(filters: FilterState, onFilterChange: FilterPanelProps["onFilterChange"], material: MaterialState) {
  const previous = useRef<{ groups: string[]; types: string[] }>({ groups: [], types: [] });
  const { selectedGroups, selectedTypes } = material.filterState;
  const clearFilters = material.clearFilters;
  useEffect(() => {
    const groups = filterValues(filters.materialGroups);
    const types = filterValues(filters.materialTypes);
    const changed = materialChanged(groups, types, selectedGroups, selectedTypes);
    const reset = externallyReset(groups, types, previous.current);
    const localHasSelection = hasMaterialSelection(selectedGroups, selectedTypes);
    if (changed && reset && localHasSelection) clearFilters();
    else if (changed) onFilterChange({ ...filters, materialGroups: selectedGroups, materialTypes: selectedTypes });
    previous.current = { groups, types };
  }, [filters, onFilterChange, clearFilters, selectedGroups, selectedTypes]);
}

function useFilterActions(filters: FilterState, onFilterChange: FilterPanelProps["onFilterChange"]) {
  const toggleArrayFilter = useCallback((key: keyof FilterState, value: string | number) => {
    const current = filters[key] as (string | number)[];
    const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
    onFilterChange({ ...filters, [key]: next });
  }, [filters, onFilterChange]);
  const toggleBooleanFilter = useCallback((key: keyof FilterState) => onFilterChange({ ...filters, [key]: !filters[key] }), [filters, onFilterChange]);
  return { toggleArrayFilter, toggleBooleanFilter };
}

function length(values: unknown[] | undefined) { return values?.length ?? 0; }
function activePrice(filters: FilterState) { return filters.priceRange[0] > 0 || filters.priceRange[1] < 9999; }
function priceUpperLabel(value: number) { return value >= 9999 ? '∞' : value; }

function buildSectionCounts(filters: FilterState, material: MaterialState) {
  const quick = [filters.isKit, filters.featured, filters.isNew, filters.hasPersonalization, filters.inStock, filters.hasCommercialPackaging].filter(Boolean).length;
  return { temas: length(filters.sicoobThemes), "tiragem-minima": Number(Boolean(filters.minQuantity && filters.minQuantity > 0)),
    cores: length(filters.colorGroups) + length(filters.colorVariations) + length(filters.colorNuances), categorias: length(filters.categories),
    estoque: Number(filters.minStock > 0), preco: Number(activePrice(filters)), fornecedores: length(filters.suppliers), publico: length(filters.publicoAlvo),
    "datas-comemorativas": length(filters.datasComemorativas), endomarketing: length(filters.endomarketing),
    materiais: material.filterState.selectedGroups.length + material.filterState.selectedTypes.length,
    "ramos-atividade": length(filters.ramosAtividade) + length(filters.segmentosAtividade), tecnicas: length(filters.techniques), tags: length(filters.tags),
    genero: length(filters.gender), tamanhos: length(filters.sizes), "opcoes-rapidas": quick, ordenacao: Number(filters.sortBy !== 'name') } as Record<string, number>;
}

function buildSectionSummaries(filters: FilterState) {
  const summaries: Record<string, string> = {};
  if (activePrice(filters)) summaries.preco = `R$${filters.priceRange[0]}–${priceUpperLabel(filters.priceRange[1])}`;
  if (filters.minStock > 0) summaries.estoque = `≥${filters.minStock} un.`;
  if (filters.minQuantity && filters.minQuantity > 0) summaries["tiragem-minima"] = `≤${filters.minQuantity} un.`;
  if (filters.sicoobThemes?.length > 0) summaries.temas = `${filters.sicoobThemes.length} sel.`;
  if (filters.sortBy !== 'name') summaries.ordenacao = SORT_OPTIONS.find(option => option.value === filters.sortBy)?.label || '';
  return summaries;
}

function useSectionInfo(filters: FilterState, material: MaterialState, search: SearchState) {
  const sectionCounts = useMemo(() => buildSectionCounts(filters, material), [filters, material]);
  const sectionSummaries = useMemo(() => buildSectionSummaries(filters), [filters]);
  const sectionMatchesSearch = useCallback((id: string, title: string) => {
    if (!search.filterSearch) return true;
    const query = search.filterSearch.toLowerCase();
    return title.toLowerCase().includes(query) || id.toLowerCase().includes(query);
  }, [search.filterSearch]);
  return { sectionCounts, sectionSummaries, sectionMatchesSearch };
}

export function useFilterPanelState(filters: FilterState, onFilterChange: FilterPanelProps["onFilterChange"], products: Products = []) {
  const search = usePanelSearchState(filters, onFilterChange);
  const productOptions = useProductOptions(products);
  const { data: categoryIcons = [] } = useCategoryIcons();
  const advanced = useAdvancedFilters();
  const suppliers = useSuppliers();
  const material = useMaterialFilter();
  const ramo = useRamoAtividadeFilter();
  const sections = useOpenSections(material);
  useMaterialBridge(filters, onFilterChange, material);
  const actions = useFilterActions(filters, onFilterChange);
  const sectionInfo = useSectionInfo(filters, material, search);
  return { ...sections, ...search, categoryIcons, ...productOptions, techniqueOptions: advanced.techniqueOptions, tagOptions: advanced.tagOptions,
    supplierOptions: suppliers.suppliers, suppliersLoading: suppliers.isLoading, materialGroups: material.groups, allMaterials: material.materials,
    materialsLoading: material.isLoading, materialFilterState: material.filterState, toggleMaterialGroup: material.toggleGroup,
    toggleMaterialType: material.toggleType, isMaterialGroupSelected: material.isGroupSelected, getTypesForGroup: material.getTypesForGroup,
    clearMaterialFilters: material.clearFilters, ramoGroups: ramo.groups, allSegmentos: ramo.segmentos, ramosLoading: ramo.isLoading,
    totalRamoGroups: ramo.totalGroups, totalRamoSegmentos: ramo.totalSegmentos, getSegmentosForRamo: ramo.getSegmentosForRamo,
    ...actions, ...sectionInfo };
}
