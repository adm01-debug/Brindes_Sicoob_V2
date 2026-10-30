import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  useExternalCategories, 
  useExternalTechniques, 
  useExternalSuppliers,
  useExternalDatabase,
  type ExternalCategory,
  type ExternalTechnique,
  type ExternalSupplier,
} from './useExternalDatabase';

// Re-exportar tipos e constantes dos novos arquivos
export type {
  ColorOption,
  CategoryOption,
  TechniqueOption,
  SupplierOption,
  MaterialOption,
  StockFilterOption,
  AdvancedFilterState,
  ColorGroupData,
  TagData,
} from '@/types/advancedFilters';

export {
  defaultAdvancedFilters,
  STOCK_FILTER_OPTIONS,
  SORT_OPTIONS,
} from '@/constants/filters';

import type { CategoryOption, TechniqueOption, SupplierOption, ColorOption, ColorGroupData, TagData, AdvancedFilterState } from '@/types/advancedFilters';
import { defaultAdvancedFilters } from '@/constants/filters';

function countActiveFilters(filters: AdvancedFilterState) {
  const arrayCount = [
    filters.categories,
    filters.suppliers,
    filters.colors,
    filters.materials,
    filters.techniques,
    filters.tags,
    filters.colorGroups,
    filters.colorVariations,
    filters.colorNuances,
    filters.datasComemorativas,
    filters.publicoAlvo,
    filters.endomarketing,
    filters.ramosAtividade,
    filters.segmentosAtividade,
    filters.gender ?? [],
  ].reduce((sum, values) => sum + values.length, 0);
  const scalarCount = [
    Boolean(filters.search),
    filters.priceRange[0] > 0 || filters.priceRange[1] < 1000,
    filters.quantityRange[0] > 1 || filters.quantityRange[1] < 10000,
    filters.stockStatus !== 'all',
    filters.isKit,
    filters.isFeatured,
    filters.isNew,
    filters.hasPersonalization,
    filters.maxLeadTimeDays !== null,
  ].filter(Boolean).length;
  return arrayCount + scalarCount;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useAdvancedFilters() {
  const [filters, setFilters] = useState<AdvancedFilterState>(defaultAdvancedFilters);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hooks para buscar dados do banco externo
  const categoriesDB = useExternalCategories();
  const techniquesDB = useExternalTechniques();
  const suppliersDB = useExternalSuppliers();
  const colorGroupsDB = useExternalDatabase<ColorGroupData>('color_groups');
  const tagsDB = useExternalDatabase<TagData>('tags');
  const fetchCategories = categoriesDB.fetchAll;
  const fetchTechniques = techniquesDB.fetchAll;
  const fetchSuppliers = suppliersDB.fetchAll;
  const fetchColorGroups = colorGroupsDB.fetchAll;
  const fetchTags = tagsDB.fetchAll;

  // Buscar dados iniciais
  useEffect(() => {
    const loadFilterOptions = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchCategories({ filters: { is_active: true }, limit: 500 }),
          fetchTechniques({ filters: { is_active: true }, limit: 100 }),
          fetchSuppliers({ limit: 100 }),
          fetchColorGroups({ filters: { is_active: true }, limit: 100 }),
          fetchTags({ limit: 200 }),
        ]);
      } catch (error) {
        console.error('Erro ao carregar opções de filtros:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFilterOptions();
  }, [fetchCategories, fetchColorGroups, fetchSuppliers, fetchTags, fetchTechniques]);

  // Transformar categorias em árvore hierárquica
  const categoryTree = useMemo((): CategoryOption[] => {
    const categories = categoriesDB.data as ExternalCategory[];
    if (!categories?.length) return [];

    const categoryMap = new Map<string, CategoryOption>();
    const roots: CategoryOption[] = [];

    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        parentId: cat.parent_id || undefined,
        level: cat.level || 0,
        path: cat.slug,
        children: [],
      });
    });

    categoryMap.forEach(cat => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(cat);
        }
      } else {
        roots.push(cat);
      }
    });

    return roots;
  }, [categoriesDB.data]);

  // Lista plana de categorias para seleção
  const categoryOptions = useMemo((): CategoryOption[] => {
    const flattenCategories = (cats: CategoryOption[], level = 0): CategoryOption[] => {
      return cats.flatMap(cat => [
        { ...cat, level },
        ...flattenCategories(cat.children || [], level + 1),
      ]);
    };
    return flattenCategories(categoryTree);
  }, [categoryTree]);

  // Técnicas de personalização
  const techniqueOptions = useMemo((): TechniqueOption[] => {
    const techniques = techniquesDB.data as ExternalTechnique[];
    return techniques?.map(tech => ({
      id: tech.id,
      name: tech.name,
      code: tech.code || '',
      estimatedDays: tech.estimated_days,
      minQuantity: tech.min_quantity,
    })) || [];
  }, [techniquesDB.data]);

  // Fornecedores
  const supplierOptions = useMemo((): SupplierOption[] => {
    const suppliers = suppliersDB.data as ExternalSupplier[];
    return suppliers?.map(sup => ({
      id: sup.id,
      name: sup.name,
      code: sup.code,
      leadTimeDays: sup.lead_time_days,
    })) || [];
  }, [suppliersDB.data]);

  // Cores
  const colorOptions = useMemo((): ColorOption[] => {
    const colors = colorGroupsDB.data as ColorGroupData[];
    return colors?.map(color => ({
      id: color.id,
      name: color.name,
      hex: color.hex_code || '#cccccc',
    })) || [];
  }, [colorGroupsDB.data]);

  // Tags
  const tagOptions = useMemo(() => {
    const tags = tagsDB.data as TagData[];
    return tags?.map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
    })) || [];
  }, [tagsDB.data]);

  // Funções para manipular filtros
  const updateFilter = useCallback(<K extends keyof AdvancedFilterState>(
    key: K,
    value: AdvancedFilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayFilter = useCallback(<K extends keyof AdvancedFilterState>(
    key: K,
    value: string
  ) => {
    setFilters(prev => {
      const currentValues = prev[key] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [key]: newValues };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultAdvancedFilters);
  }, []);

  const resetFilterGroup = useCallback((keys: (keyof AdvancedFilterState)[]) => {
    setFilters(prev => {
      const updates: Partial<AdvancedFilterState> = {};
      keys.forEach(key => {
        updates[key] = defaultAdvancedFilters[key] as never;
      });
      return { ...prev, ...updates };
    });
  }, []);

  // Contador de filtros ativos
  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);

  // Verificar se há filtros ativos em um grupo específico
  const hasActiveFiltersInGroup = useCallback((keys: (keyof AdvancedFilterState)[]) => {
    return keys.some(key => {
      const value = filters[key];
      const defaultValue = defaultAdvancedFilters[key];
      
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value) !== JSON.stringify(defaultValue);
      }
      return value !== defaultValue;
    });
  }, [filters]);

  return {
    filters,
    isLoading,
    activeFiltersCount,
    categoryTree,
    categoryOptions,
    techniqueOptions,
    supplierOptions,
    colorOptions,
    tagOptions,
    updateFilter,
    toggleArrayFilter,
    resetFilters,
    resetFilterGroup,
    setFilters,
    hasActiveFiltersInGroup,
  };
}
