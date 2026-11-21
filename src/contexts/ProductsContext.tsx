import React, { type ReactNode, useMemo, useCallback, useState, useEffect, useRef } from "react";
import { mapPromobrindToProduct, type Product } from "@/hooks/useProducts";
import { fetchPromobrindProducts } from "@/lib/external-db";
import { logger } from "@/lib/logger";
import { ProductsContext } from "./ProductsContextDef";

export { ProductsContext, useProductsContext, useProductsContextSafe } from "./ProductsContextDef";

/**
 * A ponte external-db-bridge corta a seleção de products (`VERY_HEAVY_TABLES`)
 * em 100 registros por chamada. IDs além do limite ficariam fora do cache
 * (validade "unknown" no fechamento), então a busca é dividida em lotes que
 * respeitam o teto da ponte. Falha num lote preserva o que já foi carregado.
 */
async function fetchProductBatches(ids: string[]): Promise<Product[]> {
  const BRIDGE_LIMIT = 100;
  const found: Product[] = [];
  for (let start = 0; start < ids.length; start += BRIDGE_LIMIT) {
    const chunk = ids.slice(start, start + BRIDGE_LIMIT);
    try {
      const raw = await fetchPromobrindProducts({
        filters: { id: chunk },
        limit: chunk.length,
      });
      found.push(...raw.map(mapPromobrindToProduct));
    } catch (chunkErr) {
      logger.warn(`[ProductsContext] Chunk fetch failed (${chunk.length} ids):`, chunkErr);
    }
  }
  return found;
}

/**
 * Lazy-loading ProductsProvider.
 * Does NOT fetch all 6000+ products on startup.
 * Instead, it fetches products on-demand when requested via getProductById/getProductsByIds.
 * Products from page-level queries can be registered via registerProducts.
 */
export function ProductsProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, Product>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Refs for stable callbacks
  const cacheRef = useRef<Map<string, Product>>(cache);
  const fetchingRef = useRef<Set<string>>(new Set());
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchIdsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // Cleanup on unmount (#11)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    };
  }, []);

  // Batched fetch: collects IDs over a microtask and fetches them together
  const scheduleBatchFetch = useCallback(() => {
    if (batchTimerRef.current) return; // already scheduled

    batchTimerRef.current = setTimeout(async () => {
      const idsToFetch = [...batchIdsRef.current];
      batchIdsRef.current.clear();
      batchTimerRef.current = null;

      if (idsToFetch.length === 0) return;

      idsToFetch.forEach(id => fetchingRef.current.add(id));
      if (mountedRef.current) setIsLoading(true);

      try {
        const found = await fetchProductBatches(idsToFetch);

        if (mountedRef.current) {
          setCache(prev => {
            const next = new Map(prev);
            found.forEach(p => next.set(p.id, p));
            cacheRef.current = next;
            return next;
          });
        }
      } catch (err) {
        logger.warn('[ProductsContext] Failed to fetch products by IDs:', err);
      } finally {
        idsToFetch.forEach(id => fetchingRef.current.delete(id));
        if (mountedRef.current) setIsLoading(false);
      }
    }, 50); // 50ms batching window
  }, []);

  // Queue IDs for lazy fetching
  const queueFetch = useCallback((ids: string[]) => {
    const missing = ids.filter(
      id => !cacheRef.current.has(id) && !fetchingRef.current.has(id) && !batchIdsRef.current.has(id)
    );
    if (missing.length === 0) return;

    missing.forEach(id => batchIdsRef.current.add(id));
    scheduleBatchFetch();
  }, [scheduleBatchFetch]);

  const getProductById = useCallback(
    (id: string): Product | undefined => {
      const cached = cacheRef.current.get(id);
      if (!cached) {
        queueFetch([id]);
      }
      return cached;
    },
    [queueFetch]
  );

  const getProductsByIds = useCallback(
    (ids: string[]): Product[] => {
      const found: Product[] = [];
      const missing: string[] = [];

      // Deduplicate requested IDs
      const uniqueIds = Array.from(new Set(ids));

      for (const id of uniqueIds) {
        const cached = cacheRef.current.get(id);
        if (cached) {
          found.push(cached);
        } else {
          missing.push(id);
        }
      }

      if (missing.length > 0) {
        queueFetch(missing);
      }

      return found;
    },
    [queueFetch]
  );

  // Register products from external sources (e.g. page-level useProducts queries)
  const registerProducts = useCallback((products: Product[]) => {
    if (products.length === 0) return;
    setCache(prev => {
      const next = new Map(prev);
      let changed = false;
      for (const p of products) {
        // deep compare to ensure we only update if data changed
        const existing = next.get(p.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
          next.set(p.id, p);
          changed = true;
        }
      }
      if (!changed) return prev;
      cacheRef.current = next;
      return next;
    });
  }, []);

  // Memoize the products array from cache
  const products = useMemo(() => [...cache.values()], [cache]);

  return (
    <ProductsContext.Provider value={{ products, isLoading, getProductById, getProductsByIds, registerProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}
