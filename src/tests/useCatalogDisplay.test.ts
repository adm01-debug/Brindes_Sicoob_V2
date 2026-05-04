import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCatalogDisplay } from "../hooks/catalog/useCatalogDisplay";

describe("useCatalogDisplay", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useCatalogDisplay());
    
    expect(result.current.viewMode).toBe("grid");
    expect(result.current.sortBy).toBe("name");
  });

  it("should update view mode and persist it", () => {
    const { result } = renderHook(() => useCatalogDisplay());
    
    act(() => {
      result.current.setViewMode("list");
    });

    expect(result.current.viewMode).toBe("list");
    expect(localStorage.getItem("catalog-view-mode")).toBe("list");
  });

  it("should update sort option", () => {
    const { result } = renderHook(() => useCatalogDisplay());
    
    act(() => {
      result.current.setSortBy("price-asc");
    });

    expect(result.current.sortBy).toBe("price-asc");
  });

  it("should update grid columns", () => {
    const { result } = renderHook(() => useCatalogDisplay());
    
    act(() => {
      result.current.setGridColumns(3);
    });

    expect(result.current.gridColumns).toBe(3);
    expect(localStorage.getItem("product-grid-columns")).toBe("3");
  });

  it("should clamp grid columns on window resize (mobile)", () => {
    // Mock window.innerWidth
    vi.stubGlobal('innerWidth', 400);
    
    const { result } = renderHook(() => useCatalogDisplay());
    
    // Even if we set it to 3, it should clamp to 1 on small screens
    act(() => {
      result.current.setGridColumns(3);
    });

    // The effect runs after render and when gridColumns changes
    expect(result.current.gridColumns).toBe(1);
    
    vi.unstubAllGlobals();
  });
});
