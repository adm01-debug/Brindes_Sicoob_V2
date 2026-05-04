import { describe, it, expect, beforeEach, vi } from "vitest";
import { useComparisonStore } from "../stores/useComparisonStore";

describe("useComparisonStore", () => {
  beforeEach(() => {
    useComparisonStore.getState().clearCompare();
    localStorage.clear();
  });

  it("should start with an empty list", () => {
    const { compareItems, compareCount } = useComparisonStore.getState();
    expect(compareItems).toEqual([]);
    expect(compareCount).toBe(0);
  });

  it("should add a product to compare", () => {
    const productId = "prod-1";
    const result = useComparisonStore.getState().addToCompare(productId);

    expect(result).toBe(true);
    const { compareItems, compareCount } = useComparisonStore.getState();
    expect(compareCount).toBe(1);
    expect(compareItems[0].productId).toBe(productId);
  });

  it("should not exceed max items (4)", () => {
    const store = useComparisonStore.getState();
    store.addToCompare("p1");
    store.addToCompare("p2");
    store.addToCompare("p3");
    store.addToCompare("p4");
    
    const result = store.addToCompare("p5");
    expect(result).toBe(false);
    expect(useComparisonStore.getState().compareCount).toBe(4);
  });

  it("should handle composite keys for variants", () => {
    const productId = "prod-1";
    const v1 = { variant_id: "v1", color_name: "Blue" };
    const v2 = { variant_id: "v2", color_name: "Red" };

    useComparisonStore.getState().addToCompare(productId, v1);
    useComparisonStore.getState().addToCompare(productId, v2);

    expect(useComparisonStore.getState().compareCount).toBe(2);
    expect(useComparisonStore.getState().isInCompare(productId, "v1")).toBe(true);
    expect(useComparisonStore.getState().isInCompare(productId, "v2")).toBe(true);
  });

  it("should toggle items in and out", () => {
    const productId = "prod-1";
    
    // Add
    let result = useComparisonStore.getState().toggleCompare(productId);
    expect(result.added).toBe(true);
    expect(useComparisonStore.getState().isInCompare(productId)).toBe(true);

    // Remove
    result = useComparisonStore.getState().toggleCompare(productId);
    expect(result.added).toBe(false);
    expect(useComparisonStore.getState().isInCompare(productId)).toBe(false);
  });

  it("should remove by index", () => {
    const store = useComparisonStore.getState();
    store.addToCompare("p1");
    store.addToCompare("p2");
    
    store.removeByIndex(0);
    expect(useComparisonStore.getState().compareCount).toBe(1);
    expect(useComparisonStore.getState().compareItems[0].productId).toBe("p2");
  });
});
