import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeBatchBridge, invokeExternalDb } from '@/lib/external-db';

const RELATION_PAGE_SIZE = 500;
const MAX_RELATION_PAGES = 100;

type RelationTable = 'product_tags' | 'product_variants' | 'print_area_techniques' | 'produto_ramo_atividade';

interface RelationFilterConfig {
  table: RelationTable;
  column: string;
  values: string[];
  filters?: Record<string, unknown>;
  productColumn?: string;
}

export interface CatalogRelationFilterResult {
  productIds: Set<string>;
  hasFilter: boolean;
  isLoading: boolean;
  error: Error | null;
}

function normalizedValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export async function fetchRelationProductIds({
  table,
  column,
  values,
  filters = {},
  productColumn = 'product_id',
}: RelationFilterConfig): Promise<string[]> {
  const selected = normalizedValues(values);
  if (!selected.length) return [];

  const productIds = new Set<string>();
  for (let page = 0; page < MAX_RELATION_PAGES; page += 1) {
    const result = await invokeExternalDb<Record<string, string | null | undefined>>({
      table,
      operation: 'select',
      select: productColumn,
      filters: { ...filters, [column]: selected },
      limit: RELATION_PAGE_SIZE,
      offset: page * RELATION_PAGE_SIZE,
    });
    const records = result.records ?? [];
    for (const record of records) {
      const productId = record[productColumn];
      if (productId) productIds.add(productId);
    }
    if (records.length < RELATION_PAGE_SIZE) return [...productIds];
  }
  throw new Error(`Consulta relacional excedeu ${MAX_RELATION_PAGES * RELATION_PAGE_SIZE} vínculos`);
}

function useRelationFilter(config: RelationFilterConfig): CatalogRelationFilterResult {
  const valuesKey = normalizedValues(config.values).join(',');
  const stableValues = useMemo(() => (valuesKey ? valuesKey.split(',') : []), [valuesKey]);
  const hasFilter = stableValues.length > 0;
  const query = useQuery({
    queryKey: ['catalog-relation-filter', config.table, config.column, valuesKey, config.filters],
    queryFn: () => fetchRelationProductIds({ ...config, values: stableValues }),
    enabled: hasFilter,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });
  const productIds = useMemo(() => new Set(query.data ?? []), [query.data]);
  return {
    productIds,
    hasFilter,
    isLoading: hasFilter && query.isPending,
    error: query.error,
  };
}

export function useProductsByTag(tagIds: string[]): CatalogRelationFilterResult {
  return useRelationFilter({ table: 'product_tags', column: 'tag_id', values: tagIds });
}

export function useProductsByTechnique(techniqueIds: string[]): CatalogRelationFilterResult {
  return useRelationFilter({
    table: 'print_area_techniques',
    column: 'tabela_preco_id',
    values: techniqueIds,
    filters: { is_active: true },
  });
}

export function useProductsBySize(sizes: string[]): CatalogRelationFilterResult {
  return useRelationFilter({
    table: 'product_variants',
    column: 'size_code',
    values: sizes,
    filters: { is_active: true },
  });
}

async function fetchActivityReference(): Promise<{ branches: ReferenceRecord[]; segments: ReferenceRecord[] }> {
  const results = await invokeBatchBridge([
    {
      table: 'ramo_atividade', operation: 'select', select: 'id,slug',
      filters: { ativo: true }, limit: 100,
    },
    {
      table: 'ramo_atividade_filho', operation: 'select', select: 'id,slug,ramo_atividade_id',
      filters: { ativo: true }, limit: 500,
    },
  ]);
  return { branches: recordsAt(results, 0), segments: recordsAt(results, 1) };
}

export async function fetchActivityProductIds(branchSlugs: string[], segmentSlugs: string[]): Promise<string[]> {
  const selectedBranches = new Set(normalizedValues(branchSlugs));
  const selectedSegments = new Set(normalizedValues(segmentSlugs));
  if (!selectedBranches.size && !selectedSegments.size) return [];

  const reference = await fetchActivityReference();
  const branchIds = new Set(reference.branches
    .filter((branch) => branch.slug && selectedBranches.has(branch.slug))
    .map((branch) => branch.id)
    .filter((id): id is string => Boolean(id)));
  const segmentIds = reference.segments
    .filter((segment) =>
      Boolean(segment.id) && (
        (segment.slug ? selectedSegments.has(segment.slug) : false)
        || (segment.ramo_atividade_id ? branchIds.has(segment.ramo_atividade_id) : false)
      ))
    .map((segment) => segment.id as string);

  if (!segmentIds.length) return [];
  return fetchRelationProductIds({
    table: 'produto_ramo_atividade',
    column: 'ramo_atividade_filho_id',
    values: segmentIds,
    productColumn: 'produto_id',
  });
}

export function useProductsByActivity(branchSlugs: string[], segmentSlugs: string[]): CatalogRelationFilterResult {
  const branchesKey = normalizedValues(branchSlugs).join(',');
  const segmentsKey = normalizedValues(segmentSlugs).join(',');
  const hasFilter = Boolean(branchesKey || segmentsKey);
  const query = useQuery({
    queryKey: ['catalog-activity-filter', branchesKey, segmentsKey],
    queryFn: () => fetchActivityProductIds(
      branchesKey ? branchesKey.split(',') : [],
      segmentsKey ? segmentsKey.split(',') : [],
    ),
    enabled: hasFilter,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });
  const productIds = useMemo(() => new Set(query.data ?? []), [query.data]);
  return { productIds, hasFilter, isLoading: hasFilter && query.isPending, error: query.error };
}

interface ReferenceRecord {
  id?: string;
  name?: string;
  code?: string;
  slug?: string;
  label?: string;
  value?: string;
  variation_type_id?: string;
  ramo_atividade_id?: string;
}

function recordsAt(results: Awaited<ReturnType<typeof invokeBatchBridge>>, index: number): ReferenceRecord[] {
  const result = results[index];
  return result?.success && Array.isArray(result.data?.records)
    ? (result.data.records as ReferenceRecord[])
    : [];
}

function normalizedText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export async function fetchAvailableCatalogSizes(): Promise<string[]> {
  const results = await invokeBatchBridge([
    {
      table: 'variation_types',
      operation: 'select',
      select: 'id,name,code,slug',
      filters: { is_active: true },
      limit: 100,
    },
    {
      table: 'variation_values',
      operation: 'select',
      select: 'variation_type_id,label,value',
      filters: { is_active: true },
      limit: 500,
    },
  ]);
  const sizeTypeIds = new Set(
    recordsAt(results, 0)
      .filter((type) => [type.name, type.code, type.slug].some((value) => {
        const normalized = normalizedText(value ?? '');
        return normalized.includes('tamanho') || normalized === 'size';
      }))
      .map((type) => type.id)
      .filter((id): id is string => Boolean(id)),
  );
  return [...new Set(
    recordsAt(results, 1)
      .filter((value) => value.variation_type_id && sizeTypeIds.has(value.variation_type_id))
      .map((value) => (value.label || value.value || '').trim())
      .filter(Boolean),
  )];
}

export function useAvailableCatalogSizes(): { sizes: string[]; isLoading: boolean } {
  const query = useQuery({
    queryKey: ['catalog-available-sizes'],
    queryFn: fetchAvailableCatalogSizes,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
  return { sizes: query.data ?? [], isLoading: query.isPending };
}
