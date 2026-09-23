import { useState, useCallback, useEffect } from "react";
import { getDefaultColumns, STORAGE_KEY as GRID_COLUMNS_KEY, type ColumnCount } from "@/components/products/ColumnSelector";

export type ViewMode = "grid" | "list" | "table";
export type SortOption = "name" | "price-asc" | "price-desc" | "stock" | "newest" | "color-match" | "best-seller-supplier" | "best-seller-promo";

const VIEW_MODE_KEY = "catalog-view-mode";

function getPersistedViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === "grid" || saved === "list" || saved === "table") return saved;
  } catch {}
  return "grid";
}

export function useCatalogDisplay() {
  const [viewMode, setViewModeState] = useState<ViewMode>(getPersistedViewMode);
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch {}
  }, []);

  const [gridColumns, setGridColumnsState] = useState<ColumnCount>(getDefaultColumns);
  const setGridColumns = useCallback((cols: ColumnCount) => {
    setGridColumnsState(cols);
    try { localStorage.setItem(GRID_COLUMNS_KEY, String(cols)); } catch {}
  }, []);

  const [sortBy, setSortBy] = useState<SortOption>("name");

  // Responsive clamp: force appropriate columns on small screens
  // (3 é o mínimo válido de ColumnCount — 4 colunas só fica disponível a partir de 768px, ver columnOptions em ColumnSelector.tsx)
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768 && gridColumns > 3) {
        setGridColumnsState(3);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [gridColumns]);

  return {
    viewMode,
    setViewMode,
    gridColumns,
    setGridColumns,
    sortBy,
    setSortBy,
  };
}
