import { useState, useCallback, useEffect } from "react";
import { useSearch } from "@/hooks/useSearch";
import type { Product } from "@/hooks/useProducts";

export function useCatalogSearchState(realProducts: Product[], searchQueryFromUrl: string) {
  const [searchQuery, setSearchQuery] = useState(searchQueryFromUrl);
  const [isSearching, setIsSearching] = useState(false);

  const { suggestions, quickSuggestions, history, addToHistory, clearHistory } = useSearch(realProducts);

  useEffect(() => {
    setSearchQuery(searchQueryFromUrl);
  }, [searchQueryFromUrl]);

  const handleSearch = useCallback(
    (query: string) => {
      setIsSearching(true);
      setSearchQuery(query);
      if (query) addToHistory(query);
      setTimeout(() => setIsSearching(false), 300);
    },
    [addToHistory],
  );

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
    handleSearch,
    suggestions,
    quickSuggestions,
    history,
    clearHistory,
  };
}
