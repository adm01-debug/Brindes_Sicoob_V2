import React, { type ReactNode, useMemo, useCallback, useState, useEffect, useRef } from "react";
import { type Product } from "@/hooks/useProducts";
import { fetchPromobrindProducts } from "@/lib/external-db";
import { mapPromobrindToProduct } from "@/hooks/useProducts";
import { logger } from "@/lib/logger";
import { ProductsContext } from "./ProductsContextDef";

export { ProductsContext, useProductsContext, useProductsContextSafe } from "./ProductsContextDef";

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
        const raw = await fetchPromobrindProducts({
          filters: { id: idsToFetch },
          limit: idsToFetch.length,
        });
        const mapped = raw.map(mapPromobrindToProduct);

        if (mountedRef.current) {
          setCache(prev => {
            const next = new Map(prev);
            mapped.forEach(p => next.set(p.id, p));
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

      for (const id of ids) {
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
        if (!next.has(p.id)) {
          next.set(p.id, p);
          changed = true;
        }
      }
      return changed ? next : prev;
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

