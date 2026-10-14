import type { FilterState } from '@/components/filters/FilterPanel';
import type { SupplierSalesEntry } from '@/hooks/useSupplierSalesRanking';
import type { Product } from '@/types/product-catalog';
import { sortProducts } from '@/utils/product-sorting';

const ARRAY_FILTER_KEYS = [
  'colorGroups',
  'colorVariations',
  'colorNuances',
  'colors',
  'categories',
  'suppliers',
  'publicoAlvo',
  'datasComemorativas',
  'endomarketing',
  'ramosAtividade',
  'segmentosAtividade',
  'materialGroups',
  'materialTypes',
  'materiais',
  'techniques',
  'tags',
  'gender',
  'sizes',
] as const;

const BOOLEAN_FILTER_KEYS = [
  'inStock',
  'isKit',
  'featured',
  'isNew',
  'hasPersonalization',
  'hasCommercialPackaging',
] as const;

type ArrayFilterKey = (typeof ARRAY_FILTER_KEYS)[number];
type BooleanFilterKey = (typeof BOOLEAN_FILTER_KEYS)[number];

export function firstSearchValue(...values: string[]): string {
  return values.find(Boolean) || '';
}

export function catalogSearchOptions(search: string): { search: string } | undefined {
  return search ? { search } : undefined;
}

export function catalogLoadingState(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  totalEstimate: number | null,
  loadedCount: number,
): { isFullyLoaded: boolean; loadingProgress: number } {
  const isFullyLoaded = !hasNextPage && !isFetchingNextPage;
  if (totalEstimate && totalEstimate > 0) {
    return {
      isFullyLoaded,
      loadingProgress: Math.min(Math.round((loadedCount / totalEstimate) * 100), 100),
    };
  }
  return { isFullyLoaded, loadingProgress: isFullyLoaded ? 100 : 0 };
}

function readArray(params: URLSearchParams, key: string): string[] {
  return (params.get(key) || '').split(',').filter(Boolean);
}

function applyArrayParams(filters: FilterState, params: URLSearchParams): void {
  for (const key of ARRAY_FILTER_KEYS) {
    const values = readArray(params, key);
    if (values.length) filters[key] = values;
  }
}

function applyScalarParams(filters: FilterState, params: URLSearchParams): void {
  const search = params.get('search');
  const singleSupplier = params.get('supplier');
  const priceMin = params.get('priceMin');
  const priceMax = params.get('priceMax');
  const minStock = params.get('minStock');
  const sortBy = params.get('sortBy');
  if (search) filters.search = search;
  if (singleSupplier && !filters.suppliers.includes(singleSupplier)) {
    filters.suppliers = [...filters.suppliers, singleSupplier];
  }
  if (priceMin || priceMax)
    filters.priceRange = [priceMin ? parseInt(priceMin) : 0, priceMax ? parseInt(priceMax) : 9999];
  if (minStock) filters.minStock = parseInt(minStock);
  if (sortBy) filters.sortBy = sortBy;
}

function applyBooleanParams(filters: FilterState, params: URLSearchParams): void {
  for (const key of BOOLEAN_FILTER_KEYS) filters[key] = params.get(key) === '1';
}

export function deserializeFilters(params: URLSearchParams, defaults: FilterState): FilterState {
  const filters: FilterState = { ...defaults };
  applyArrayParams(filters, params);
  applyScalarParams(filters, params);
  applyBooleanParams(filters, params);
  return filters;
}

function setArrayParam(params: URLSearchParams, key: ArrayFilterKey, values: string[]): void {
  if (values.length) params.set(key, values.join(','));
}

function setBooleanParam(params: URLSearchParams, key: BooleanFilterKey, value: boolean): void {
  if (value) params.set(key, '1');
}

export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ARRAY_FILTER_KEYS) setArrayParam(params, key, filters[key]);
  for (const key of BOOLEAN_FILTER_KEYS) setBooleanParam(params, key, filters[key]);
  if (filters.search) params.set('search', filters.search);
  if (filters.priceRange[0] > 0) params.set('priceMin', String(filters.priceRange[0]));
  if (filters.priceRange[1] < 9999) params.set('priceMax', String(filters.priceRange[1]));
  if (filters.minStock > 0) params.set('minStock', String(filters.minStock));
  if (filters.sortBy !== 'name') params.set('sortBy', filters.sortBy);
  return params;
}

function totalLength(...arrays: string[][]): number {
  return arrays.reduce((total, values) => total + values.length, 0);
}

export function countActiveFilters(filters: FilterState): number {
  const groupedCounts = [
    totalLength(filters.colorGroups, filters.colorVariations, filters.colorNuances, filters.colors),
    totalLength(filters.materialGroups, filters.materialTypes, filters.materiais),
    totalLength(filters.ramosAtividade, filters.segmentosAtividade),
  ];
  const individualArrays = [
    filters.categories,
    filters.suppliers,
    filters.publicoAlvo,
    filters.datasComemorativas,
    filters.endomarketing,
    filters.techniques,
    filters.tags,
    filters.gender,
    filters.sizes,
  ];
  const activeFlags = [
    ...groupedCounts.map((count) => count > 0),
    ...individualArrays.map((values) => values.length > 0),
    filters.priceRange[0] > 0 || filters.priceRange[1] < 9999,
    filters.minStock > 0,
    ...BOOLEAN_FILTER_KEYS.map((key) => filters[key]),
    Boolean(filters.search),
  ];
  return activeFlags.filter(Boolean).length;
}

function filterByIdSet(
  products: Product[],
  active: boolean,
  ids: Set<string>,
  loading: boolean,
): Product[] {
  if (!active) return products;
  if (ids.size) return products.filter((product) => ids.has(product.id));
  return loading ? products : [];
}

function filterBySearch(products: Product[], search: string): Product[] {
  if (!search) return products;
  const term = search.toLowerCase();
  return products.filter((product) =>
    [product.name, product.sku, product.description || ''].some((value) =>
      value.toLowerCase().includes(term),
    ),
  );
}

function filterBySuppliers(products: Product[], suppliers: string[]): Product[] {
  if (!suppliers.length) return products;
  return products.filter((product) => {
    const supplierId = product.supplier?.id || '';
    const supplierName = (product.supplier?.name || product.brand || '').toLowerCase();
    const reference = product.supplier_reference || '';
    return (
      suppliers.includes(supplierId) ||
      suppliers.some((value) => supplierName.includes(value.toLowerCase())) ||
      suppliers.includes(reference)
    );
  });
}

type TagKey = 'publicoAlvo' | 'datasComemorativas' | 'endomarketing';

function filterByTag(
  products: Product[],
  selected: string[],
  key: TagKey,
  partial: boolean,
): Product[] {
  if (!selected.length) return products;
  return products.filter((product) =>
    selected.some((value) =>
      (product.tags?.[key] || []).some((tag) =>
        partial
          ? tag.toLowerCase().includes(value.toLowerCase())
          : tag.toLowerCase() === value.toLowerCase(),
      ),
    ),
  );
}

function filterByMaterials(products: Product[], active: boolean, selected: string[]): Product[] {
  if (active || !selected.length) return products;
  return products.filter((product) => {
    const materials = product.materials.join(' ').toLowerCase();
    return selected.some((value) => materials.includes(value.toLowerCase()));
  });
}

function filterByPrice(products: Product[], range: [number, number]): Product[] {
  if (range[0] <= 0 && range[1] >= 9999) return products;
  return products.filter((product) => product.price >= range[0] && product.price <= range[1]);
}

function hasMinimumStock(product: Product, minimum: number): boolean {
  if (product.variations?.length)
    return product.variations.some((variation) => variation.stock >= minimum);
  return product.stock >= minimum;
}

function filterByStock(products: Product[], filters: FilterState): Product[] {
  let result =
    filters.minStock > 0
      ? products.filter((product) => hasMinimumStock(product, filters.minStock))
      : products;
  if (filters.inStock) result = result.filter((product) => product.stock > 0);
  return result;
}

function filterByFlags(products: Product[], filters: FilterState): Product[] {
  let result = products;
  if (filters.hasCommercialPackaging)
    result = result.filter((product) => product.hasCommercialPackaging === true);
  if (filters.isKit) result = result.filter((product) => product.isKit === true);
  if (filters.featured) result = result.filter((product) => product.featured === true);
  if (filters.isNew) result = result.filter((product) => product.newArrival === true);
  if (filters.hasPersonalization)
    result = result.filter((product) => product.allowsPersonalization === true);
  return result;
}

function filterByGender(products: Product[], selected: string[]): Product[] {
  if (!selected.length) return products;
  const normalized = new Set(selected.map((value) => value.toLocaleLowerCase('pt-BR').trim()));
  return products.filter((product) => normalized.has((product.gender || '').toLocaleLowerCase('pt-BR').trim()));
}

export interface ProductFilterContext {
  filters: FilterState;
  products: Product[];
  materialIds: Set<string>;
  categoryIds: Set<string>;
  colorIds: Set<string>;
  hasMaterialFilter: boolean;
  hasCategoryFilter: boolean;
  hasColorFilter: boolean;
  loadingMaterial: boolean;
  loadingCategory: boolean;
  loadingColor: boolean;
  tagIds: Set<string>;
  techniqueIds: Set<string>;
  sizeIds: Set<string>;
  activityIds: Set<string>;
  hasTagFilter: boolean;
  hasTechniqueFilter: boolean;
  hasSizeFilter: boolean;
  hasActivityFilter: boolean;
  loadingTag: boolean;
  loadingTechnique: boolean;
  loadingSize: boolean;
  loadingActivity: boolean;
  sortBy: string;
  promoSalesMap?: Map<string, number>;
  supplierSalesMap?: Map<string, SupplierSalesEntry>;
  skipSort: boolean;
}

export function applyProductFilters(context: ProductFilterContext): Product[] {
  let result = filterBySearch(context.products, context.filters.search);
  result = filterByIdSet(result, context.hasColorFilter, context.colorIds, context.loadingColor);
  result = filterByIdSet(
    result,
    context.hasCategoryFilter,
    context.categoryIds,
    context.loadingCategory,
  );
  result = filterBySuppliers(result, context.filters.suppliers);
  result = filterByTag(result, context.filters.publicoAlvo, 'publicoAlvo', false);
  result = filterByTag(result, context.filters.datasComemorativas, 'datasComemorativas', true);
  result = filterByTag(result, context.filters.endomarketing, 'endomarketing', false);
  result = filterByIdSet(
    result,
    context.hasMaterialFilter,
    context.materialIds,
    context.loadingMaterial,
  );
  result = filterByMaterials(result, context.hasMaterialFilter, context.filters.materiais);
  result = filterByPrice(result, context.filters.priceRange);
  result = filterByStock(result, context.filters);
  result = filterByFlags(result, context.filters);
  result = filterByGender(result, context.filters.gender);
  result = filterByIdSet(result, context.hasTagFilter, context.tagIds, context.loadingTag);
  result = filterByIdSet(result, context.hasTechniqueFilter, context.techniqueIds, context.loadingTechnique);
  result = filterByIdSet(result, context.hasSizeFilter, context.sizeIds, context.loadingSize);
  result = filterByIdSet(result, context.hasActivityFilter, context.activityIds, context.loadingActivity);
  return sortProducts(result, context.sortBy, {
    promoSalesMap: context.promoSalesMap,
    supplierSalesMap: context.supplierSalesMap,
    skipSort: context.skipSort,
  });
}

export interface ColorEnrichmentValue {
  image?: string | null;
  stock: number;
  stockStatus: Product['stockStatus'];
  colorName?: string | null;
  colorHex?: string | null;
}

function enrichProduct(
  product: Product,
  enrichment: ColorEnrichmentValue | undefined,
  filters: FilterState,
): Product {
  if (!enrichment) return product;
  const imageFields = enrichment.image
    ? {
        og_image_url: enrichment.image,
        images: [enrichment.image, ...product.images.filter((image) => image !== enrichment.image)],
      }
    : {};
  const colors = enrichment.colorName
    ? [
        {
          name: enrichment.colorName,
          hex: enrichment.colorHex || '#CCCCCC',
          group: enrichment.colorName,
          groupSlug: filters.colorGroups[0] || undefined,
          variationSlug: filters.colorVariations[0] || undefined,
          image: enrichment.image || undefined,
          images: enrichment.image ? [enrichment.image] : undefined,
        },
      ]
    : product.colors;
  return {
    ...product,
    ...imageFields,
    stock: enrichment.stock,
    stockStatus: enrichment.stockStatus,
    colors,
  };
}

export function enrichFilteredProducts(
  products: Product[],
  enrichmentMap: Map<string, ColorEnrichmentValue> | undefined,
  filters: FilterState,
): Product[] {
  if (!enrichmentMap?.size) return products;
  return products.map((product) => enrichProduct(product, enrichmentMap.get(product.id), filters));
}

export interface ActiveFilterSummary {
  label: string;
  value: string;
  key: keyof FilterState;
}

function selectionLabel(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

function addCountSummary(
  summary: ActiveFilterSummary[],
  count: number,
  definition: { label: string; word: string; key: keyof FilterState },
): void {
  const { label, word, key } = definition;
  if (count > 0) summary.push({ label, value: selectionLabel(count, word), key });
}

export function buildActiveFiltersSummary(filters: FilterState): ActiveFilterSummary[] {
  const summary: ActiveFilterSummary[] = [];
  addCountSummary(
    summary,
    totalLength(filters.colorGroups, filters.colorVariations, filters.colorNuances, filters.colors),
    { label: 'Cores', word: 'selecionada', key: 'colors' },
  );
  addCountSummary(summary, filters.categories.length, { label: 'Categorias', word: 'selecionada', key: 'categories' });
  addCountSummary(summary, filters.suppliers.length, { label: 'Fornecedores', word: 'selecionado', key: 'suppliers' });
  if (filters.publicoAlvo.length)
    summary.push({
      label: 'Público-Alvo',
      value:
        filters.publicoAlvo.slice(0, 2).join(', ') +
        (filters.publicoAlvo.length > 2 ? ` +${filters.publicoAlvo.length - 2}` : ''),
      key: 'publicoAlvo',
    });
  if (filters.datasComemorativas.length)
    summary.push({
      label: 'Datas',
      value: filters.datasComemorativas[0] ?? '',
      key: 'datasComemorativas',
    });
  if (filters.endomarketing.length)
    summary.push({
      label: 'Endomarketing',
      value: filters.endomarketing.slice(0, 2).join(', '),
      key: 'endomarketing',
    });
  addCountSummary(
    summary,
    totalLength(filters.materialGroups, filters.materialTypes, filters.materiais),
    { label: 'Materiais', word: 'selecionado', key: 'materiais' },
  );
  addCountSummary(
    summary,
    totalLength(filters.ramosAtividade, filters.segmentosAtividade),
    { label: 'Nichos', word: 'selecionado', key: 'ramosAtividade' },
  );
  if (filters.gender.length)
    summary.push({ label: 'Gênero', value: filters.gender.join(', '), key: 'gender' });
  addCountSummary(summary, filters.sizes.length, { label: 'Tamanhos', word: 'selecionado', key: 'sizes' });
  return summary;
}
