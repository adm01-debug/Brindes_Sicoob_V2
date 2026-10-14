import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

const RELATION_PAGE_SIZE = 500;
const MAX_RELATION_RECORDS = 100_000;

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
  hasData: boolean;
  isLoading: boolean;
  error: Error | null;
}

async function fetchRelationPages(
  config: Omit<RelationFilterConfig, 'values'>,
  selected: string[],
): Promise<string[]> {
  const { table, column, filters = {}, productColumn = 'product_id' } = config;
  const productIds = new Set<string>();
  let offset = 0;
  while (offset < MAX_RELATION_RECORDS) {
    const result = await invokeExternalDb<Record<string, string | null | undefined>>({
      table,
      operation: 'select',
      select: productColumn,
      filters: { ...filters, [column]: selected },
      orderBy: { column: productColumn, ascending: true },
      limit: RELATION_PAGE_SIZE,
      offset,
    });
    const records = result.records ?? [];
    for (const record of records) {
      const productId = record[productColumn];
      if (productId) productIds.add(productId);
    }
    const effectiveLimit = Number((result.meta as { effective_limit?: number } | undefined)?.effective_limit)
      || RELATION_PAGE_SIZE;
    if (records.length < effectiveLimit) return [...productIds];
    offset += records.length;
  }
  throw new Error(`Consulta relacional excedeu ${MAX_RELATION_RECORDS} vínculos`);
}

function normalizedValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'pt-BR'));
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
  return fetchRelationPages({ table, column, filters, productColumn }, selected);
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
    hasData: query.data !== undefined,
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
  const [branches, segments] = await Promise.all([
    fetchReferenceRecords('ramo_atividade', 'id,slug', { ativo: true }),
    fetchReferenceRecords('ramo_atividade_filho', 'id,slug,ramo_atividade_id', { ativo: true }),
  ]);
  return { branches, segments };
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
  return { productIds, hasFilter, hasData: query.data !== undefined, isLoading: hasFilter && query.isPending, error: query.error };
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

async function fetchReferenceRecords(
  table: string,
  select: string,
  filters: Record<string, unknown>,
): Promise<ReferenceRecord[]> {
  const records: ReferenceRecord[] = [];
  let offset = 0;
  while (offset < MAX_RELATION_RECORDS) {
    const result = await invokeExternalDb<ReferenceRecord>({
      table,
      operation: 'select',
      select,
      filters,
      orderBy: { column: 'id', ascending: true },
      limit: RELATION_PAGE_SIZE,
      offset,
    });
    const page = result.records ?? [];
    records.push(...page);
    const effectiveLimit = Number((result.meta as { effective_limit?: number } | undefined)?.effective_limit)
      || RELATION_PAGE_SIZE;
    if (page.length < effectiveLimit || page.length === 0) return records;
    offset += page.length;
  }
  throw new Error(`Referência ${table} excedeu ${MAX_RELATION_RECORDS} registros`);
}

function normalizedText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export async function fetchAvailableCatalogSizes(): Promise<string[]> {
  const [types, values] = await Promise.all([
    fetchReferenceRecords('variation_types', 'id,name,code,slug', { is_active: true }),
    fetchReferenceRecords('variation_values', 'id,variation_type_id,label,value', { is_active: true }),
  ]);
  const sizeTypeIds = new Set(
    types
      .filter((type) => [type.name, type.code, type.slug].some((value) => {
        const normalized = normalizedText(value ?? '');
        return normalized.includes('tamanho') || normalized === 'size';
      }))
      .map((type) => type.id)
      .filter((id): id is string => Boolean(id)),
  );
  return [...new Set(
    values
      .filter((value) => value.variation_type_id && sizeTypeIds.has(value.variation_type_id))
      // `product_variants.size_code` armazena o valor canônico da variação.
      // O label é apenas apresentação e pode ser "Grande" enquanto value é "G".
      .map((value) => (value.value || value.label || '').trim())
      .filter(Boolean),
  )];
}

export function useAvailableCatalogSizes(): { sizes: string[]; isLoading: boolean; error: Error | null; retry: () => void } {
  const query = useQuery({
    queryKey: ['catalog-available-sizes'],
    queryFn: fetchAvailableCatalogSizes,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
  return {
    sizes: query.data ?? [],
    isLoading: query.isPending,
    error: query.error instanceof Error ? query.error : null,
    retry: () => { void query.refetch(); },
  };
}
