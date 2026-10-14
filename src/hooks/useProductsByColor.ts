/**
 * useProductsByColor — Server-side color filtering
 * 
 * Queries product_variants + color_variations + color_groups via external-db-bridge
 * to return product IDs matching selected color filters.
 * Works with lightweight products that don't have embedded color data.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invokeBatchBridge } from '@/lib/external-db';
import { logger } from '@/lib/logger';

interface UseProductsByColorOptions {
  colorGroups: string[];       // group slugs
  colorVariations: string[];   // variation slugs
  colorNuances: string[];      // nuance keywords (client-side only, not supported server-side)
  colors: string[];            // legacy color names
}

interface UseProductsByColorResult {
  productIds: Set<string>;
  hasFilter: boolean;
  isLoading: boolean;
  error: Error | null;
}

interface BatchResultShape {
  success?: boolean;
  data?: { records?: unknown[] };
  error?: string;
}

function recordsFromResult(result: unknown, source: string): Record<string, unknown>[] {
  const batchResult = result as BatchResultShape | undefined;
  if (!batchResult?.success || !Array.isArray(batchResult.data?.records)) {
    throw new Error(batchResult?.error || `Consulta de ${source} não retornou dados válidos`);
  }
  return batchResult.data.records as Record<string, unknown>[];
}

function groupIdsBySlug(groups: Record<string, unknown>[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of groups) {
    if (typeof group.slug === 'string' && typeof group.id === 'string') {
      map.set(group.slug, group.id);
    }
  }
  return map;
}

function variationsBySlug(variations: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const variation of variations) {
    if (typeof variation.slug === 'string') map.set(variation.slug, variation);
  }
  return map;
}

function addVariationFilters(
  target: Set<string>,
  slugs: string[],
  variations: Map<string, Record<string, unknown>>,
): void {
  for (const slug of slugs) {
    const id = variations.get(slug)?.id;
    if (typeof id === 'string') target.add(id);
  }
}

function addGroupFilters(
  target: Set<string>,
  slugs: string[],
  groups: Map<string, string>,
  variations: Record<string, unknown>[],
): void {
  const selectedGroupIds = new Set(slugs.map((slug) => groups.get(slug)).filter(Boolean));
  for (const variation of variations) {
    const groupId = variation.group_id ?? variation.color_group_id;
    if (selectedGroupIds.has(groupId as string) && typeof variation.id === 'string') {
      target.add(variation.id);
    }
  }
}

function addNuanceFilters(
  target: Set<string>,
  slugs: string[],
  nuances: Record<string, unknown>[],
  variations: Record<string, unknown>[],
): void {
  const nuanceIds = new Set(
    nuances
      .filter((nuance) => typeof nuance.slug === 'string' && slugs.includes(nuance.slug))
      .map((nuance) => nuance.id)
      .filter((id): id is string => typeof id === 'string'),
  );
  for (const variation of variations) {
    if (nuanceIds.has(variation.nuance_id as string) && typeof variation.id === 'string') {
      target.add(variation.id);
    }
  }
}

function addLegacyColorFilters(
  target: Set<string>,
  colors: string[],
  variations: Record<string, unknown>[],
): void {
  const selectedNames = new Set(colors.map((color) => color.toLowerCase()));
  for (const variation of variations) {
    if (typeof variation.name !== 'string' || typeof variation.id !== 'string') continue;
    if (selectedNames.has(variation.name.toLowerCase())) target.add(variation.id);
  }
}

function resolveTargetColorIds(
  options: UseProductsByColorOptions,
  groups: Record<string, unknown>[],
  variations: Record<string, unknown>[],
  nuances: Record<string, unknown>[],
): Set<string> {
  const target = new Set<string>();
  addVariationFilters(target, options.colorVariations, variationsBySlug(variations));
  addGroupFilters(target, options.colorGroups, groupIdsBySlug(groups), variations);
  addNuanceFilters(target, options.colorNuances, nuances, variations);
  addLegacyColorFilters(target, options.colors, variations);
  return target;
}

const COLOR_RELATION_PAGE_SIZE = 500;
const MAX_COLOR_RELATION_PAGES = 100;

async function fetchColorChunk(colorIds: string[]): Promise<Set<string>> {
  const matching = new Set<string>();
  for (let page = 0; page < MAX_COLOR_RELATION_PAGES; page += 1) {
    const results = await invokeBatchBridge([{
      table: 'product_variants',
      operation: 'select',
      select: 'product_id',
      filters: { is_active: true, color_id: colorIds },
      orderBy: { column: 'product_id', ascending: true },
      limit: COLOR_RELATION_PAGE_SIZE,
      offset: page * COLOR_RELATION_PAGE_SIZE,
    }]);
    const records = recordsFromResult(results[0], 'produtos por cor');
    for (const record of records) {
      if (typeof record.product_id === 'string') matching.add(record.product_id);
    }
    if (records.length < COLOR_RELATION_PAGE_SIZE) break;
    if (page === MAX_COLOR_RELATION_PAGES - 1) {
      throw new Error('Consulta de cores excedeu o limite seguro de vínculos');
    }
  }
  return matching;
}

export async function fetchMatchingProductIds(colorIds: string[]): Promise<Set<string>> {
  const matching = new Set<string>();
  const chunkSize = 50;
  for (let index = 0; index < colorIds.length; index += chunkSize) {
    const chunkMatches = await fetchColorChunk(colorIds.slice(index, index + chunkSize));
    chunkMatches.forEach((productId) => matching.add(productId));
  }
  return matching;
}

async function loadMatchingProductIds(options: UseProductsByColorOptions): Promise<{
  productIds: Set<string>;
  colorCount: number;
}> {
  const refResults = await invokeBatchBridge([
    {
      table: 'color_groups',
      operation: 'select',
      select: 'id, name, slug',
      filters: { is_active: true },
      limit: 200,
      offset: 0,
      cacheKey: 'ref:color_groups',
    },
    {
      table: 'color_variations',
      operation: 'select',
      select: 'id, name, slug, group_id, color_group_id, nuance_id',
      filters: { is_active: true },
      limit: 500,
      offset: 0,
      cacheKey: 'ref:color_variations',
    },
    {
      table: 'color_nuances',
      operation: 'select',
      select: 'id, name, slug',
      filters: { is_active: true },
      limit: 100,
      offset: 0,
      cacheKey: 'ref:color_nuances',
    },
  ]);
  const targetColorIds = resolveTargetColorIds(
    options,
    recordsFromResult(refResults[0], 'grupos de cores'),
    recordsFromResult(refResults[1], 'variações de cores'),
    recordsFromResult(refResults[2], 'nuances de cores'),
  );
  const colorIds = [...targetColorIds];
  return {
    productIds: colorIds.length ? await fetchMatchingProductIds(colorIds) : new Set<string>(),
    colorCount: colorIds.length,
  };
}

export function useProductsByColor({
  colorGroups,
  colorVariations,
  colorNuances,
  colors,
}: UseProductsByColorOptions): UseProductsByColorResult {
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hasFilter = useMemo(() =>
    colorGroups.length > 0 || colorVariations.length > 0 || colorNuances.length > 0 || colors.length > 0,
    [colorGroups.length, colorVariations.length, colorNuances.length, colors.length]
  );

  const filterKey = useMemo(() =>
    [...colorGroups].sort().join(',') + '|' +
    [...colorVariations].sort().join(',') + '|' +
    [...colorNuances].sort().join(',') + '|' +
    [...colors].sort().join(','),
    [colorGroups, colorVariations, colorNuances, colors]
  );

  const lastFetchedKey = useRef('');
  const inFlightKeyRef = useRef('');
  const requestSequenceRef = useRef(0);

  const fetchProductIds = useCallback(async () => {
    if (lastFetchedKey.current === filterKey) return;
    if (inFlightKeyRef.current === filterKey) return;

    if (!hasFilter) {
      requestSequenceRef.current += 1;
      inFlightKeyRef.current = '';
      setIsLoading(false);
      setError(null);
      setProductIds(new Set());
      lastFetchedKey.current = '';
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    inFlightKeyRef.current = filterKey;
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadMatchingProductIds({ colorGroups, colorVariations, colorNuances, colors });

      if (requestSequenceRef.current !== requestId) return;
      setProductIds(result.productIds);
      lastFetchedKey.current = filterKey;
      logger.log(`[useProductsByColor] Found ${result.productIds.size} products for ${result.colorCount} color IDs`);
    } catch (err) {
      logger.warn('[useProductsByColor] Error:', err);
      if (requestSequenceRef.current === requestId) {
        setProductIds(new Set());
        setError(err instanceof Error ? err : new Error('Falha ao consultar produtos por cor'));
        lastFetchedKey.current = filterKey;
      }
    } finally {
      if (requestSequenceRef.current === requestId) {
        setIsLoading(false);
        inFlightKeyRef.current = '';
      }
    }
  }, [colorGroups, colorNuances, colorVariations, colors, filterKey, hasFilter]);

  useEffect(() => {
    if (filterKey !== lastFetchedKey.current || !hasFilter) {
      fetchProductIds();
    }
  }, [filterKey, hasFilter, fetchProductIds]);

  return { productIds, hasFilter, isLoading, error };
}
