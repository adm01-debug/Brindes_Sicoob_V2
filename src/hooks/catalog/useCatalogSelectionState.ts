import { useState, useCallback } from "react";

export function useCatalogSelectionState() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) setSelectedCount(0);
      return !prev;
    });
  }, []);

  return {
    selectionMode,
    setSelectionMode,
    selectedCount,
    setSelectedCount,
    toggleSelectionMode,
  };
}
