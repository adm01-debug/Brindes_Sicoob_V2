import { useState, useCallback, useRef, useEffect } from "react";

export const ITEMS_PER_PAGE = 24; // Increased to reduce layout shifts during load-more

interface UseCatalogPaginationProps {
  isLoading: boolean;
  hasMoreProducts: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  fetchNextPage: () => Promise<any>;
  filteredProductsLength: number;
}

export function useCatalogPagination({
  isLoading,
  hasMoreProducts,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  filteredProductsLength,
}: UseCatalogPaginationProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isUpdatingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (isUpdatingRef.current) return;
    if (isLoading || isLoadingMore || isFetchingNextPage) return;
    if (!hasMoreProducts) return;

    isUpdatingRef.current = true;
    setIsLoadingMore(true);

    const nextDisplayCount = displayCount + ITEMS_PER_PAGE;
    const needsServerData = nextDisplayCount >= filteredProductsLength && hasNextPage;

    if (needsServerData) {
      fetchNextPage().finally(() => {
        setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        setIsLoadingMore(false);
        setTimeout(() => { isUpdatingRef.current = false; }, 100);
      });
    } else {
      setTimeout(() => {
        setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        setIsLoadingMore(false);
        setTimeout(() => { isUpdatingRef.current = false; }, 100);
      }, 150);
    }
  }, [isLoading, isLoadingMore, isFetchingNextPage, hasMoreProducts, displayCount, filteredProductsLength, hasNextPage, fetchNextPage]);

  useEffect(() => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMoreProducts && !isLoadingMore && !isUpdatingRef.current) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => { observerRef.current?.disconnect(); };
  }, [isLoading, hasMoreProducts, isLoadingMore, loadMore]);

  return {
    displayCount,
    setDisplayCount,
    isLoadingMore,
    loadMore,
    loadMoreRef,
  };
}
