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
}

interface BatchResultShape {
  success?: boolean;
  data?: { records?: unknown[] };
}

function recordsFromResult(result: unknown): Record<string, unknown>[] {
  const batchResult = result as BatchResultShape | undefined;
  if (!batchResult?.success || !Array.isArray(batchResult.data?.records)) return [];
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
    if (selectedGroupIds.has(variation.group_id as string) && typeof variation.id === 'string') {
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
  options: Pick<UseProductsByColorOptions, 'colorGroups' | 'colorVariations' | 'colors'>,
  groups: Record<string, unknown>[],
  variations: Record<string, unknown>[],
): Set<string> {
  const target = new Set<string>();
  addVariationFilters(target, options.colorVariations, variationsBySlug(variations));
  addGroupFilters(target, options.colorGroups, groupIdsBySlug(groups), variations);
  addLegacyColorFilters(target, options.colors, variations);
  return target;
}

async function fetchMatchingProductIds(colorIds: string[]): Promise<Set<string>> {
  const matching = new Set<string>();
  const chunkSize = 50;
  for (let index = 0; index < colorIds.length; index += chunkSize) {
    const chunk = colorIds.slice(index, index + chunkSize);
    const results = await invokeBatchBridge([{
      table: 'product_variants',
      operation: 'select',
      select: 'product_id',
      filters: { is_active: true, color_id: chunk },
      limit: 5000,
      offset: 0,
    }]);
    for (const record of recordsFromResult(results[0])) {
      if (typeof record.product_id === 'string') matching.add(record.product_id);
    }
  }
  return matching;
}

export function useProductsByColor({
  colorGroups,
  colorVariations,
  colorNuances,
  colors,
}: UseProductsByColorOptions): UseProductsByColorResult {
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

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
  const isFetchingRef = useRef(false);

  const fetchProductIds = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (lastFetchedKey.current === filterKey) return;

    if (!hasFilter) {
      setProductIds(new Set());
      lastFetchedKey.current = '';
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      // Step 1: Load color_groups and color_variations reference tables
      const refQueries = [
        {
          table: 'color_groups',
          operation: 'select' as const,
          select: 'id, name, slug',
          filters: { is_active: true },
          limit: 200,
          offset: 0,
          cacheKey: 'ref:color_groups',
        },
        {
          table: 'color_variations',
          operation: 'select' as const,
          select: 'id, name, slug, group_id',
          filters: { is_active: true },
          limit: 500,
          offset: 0,
          cacheKey: 'ref:color_variations',
        },
      ];

      const refResults = await invokeBatchBridge(refQueries);

      const groupsData = recordsFromResult(refResults[0]);
      const variationsData = recordsFromResult(refResults[1]);
      const targetColorIds = resolveTargetColorIds(
        { colorGroups, colorVariations, colors },
        groupsData,
        variationsData,
      );

      if (targetColorIds.size === 0 && colorNuances.length === 0) {
        // No matching color_ids found — no products match
        setProductIds(new Set());
        lastFetchedKey.current = filterKey;
        return;
      }

      // Step 2: Query product_variants to get product_ids matching those color_ids
      const colorIdArray = [...targetColorIds];
      const matchingProductIds = await fetchMatchingProductIds(colorIdArray);

      setProductIds(matchingProductIds);
      lastFetchedKey.current = filterKey;
      logger.log(`[useProductsByColor] Found ${matchingProductIds.size} products for ${colorIdArray.length} color IDs`);
    } catch (err) {
      logger.warn('[useProductsByColor] Error:', err);
      setProductIds(new Set());
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [colorGroups, colorNuances.length, colorVariations, colors, filterKey, hasFilter]);

  useEffect(() => {
    if (filterKey !== lastFetchedKey.current || !hasFilter) {
      fetchProductIds();
    }
  }, [filterKey, hasFilter, fetchProductIds]);

  return { productIds, hasFilter, isLoading };
}
