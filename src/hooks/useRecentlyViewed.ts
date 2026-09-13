import { useCallback } from "react";
import { type Product } from "@/hooks/useProducts";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";
export type { RecentlyViewedItem } from "@/stores/useRecentlyViewedStore";

export function useRecentlyViewed() {
  const items = useRecentlyViewedStore(state => state.items);
  const isLoaded = useRecentlyViewedStore(state => state.isLoaded);
  const addToRecentlyViewed = useRecentlyViewedStore(state => state.addToRecentlyViewed);
  const removeFromRecentlyViewed = useRecentlyViewedStore(state => state.removeFromRecentlyViewed);
  const clearRecentlyViewed = useRecentlyViewedStore(state => state.clearRecentlyViewed);

  const getRecentlyViewedProductsFromMap = useCallback(
    (getProductsByIds: (ids: string[]) => Product[]): Product[] =>
      getProductsByIds(items.map((i) => i.productId)),
    [items]
  );

  return {
    items,
    itemCount: items.length,
    addToRecentlyViewed,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
    getRecentlyViewedProductsFromMap,
    isLoaded,
  };
}
