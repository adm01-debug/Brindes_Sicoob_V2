import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFavoritesStore } from "../stores/useFavoritesStore";

// Mock Haptics to avoid errors
vi.mock("@/utils/haptics", () => ({
  Haptics: {
    notificationSuccess: vi.fn(),
    impactLight: vi.fn(),
    impactMedium: vi.fn(),
  },
}));

describe("useFavoritesStore", () => {
  beforeEach(() => {
    useFavoritesStore.getState().clearFavorites();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should start with an empty list", () => {
    const { favorites, favoriteCount } = useFavoritesStore.getState();
    expect(favorites).toEqual([]);
    expect(favoriteCount).toBe(0);
  });

  it("should add a favorite product", () => {
    const productId = "prod-1";
    useFavoritesStore.getState().addFavorite(productId);

    const { favorites, favoriteCount } = useFavoritesStore.getState();
    expect(favoriteCount).toBe(1);
    expect(favorites[0].productId).toBe(productId);
    expect(useFavoritesStore.getState().isFavorite(productId)).toBe(true);
  });

  it("should not add the same product twice", () => {
    const productId = "prod-1";
    useFavoritesStore.getState().addFavorite(productId);
    useFavoritesStore.getState().addFavorite(productId);

    const { favoriteCount } = useFavoritesStore.getState();
    expect(favoriteCount).toBe(1);
  });

  it("should remove a favorite product", () => {
    const productId = "prod-1";
    useFavoritesStore.getState().addFavorite(productId);
    useFavoritesStore.getState().removeFavorite(productId);

    const { favorites, favoriteCount } = useFavoritesStore.getState();
    expect(favoriteCount).toBe(0);
    expect(favorites).toEqual([]);
    expect(useFavoritesStore.getState().isFavorite(productId)).toBe(false);
  });

  it("should toggle a favorite product", () => {
    const productId = "prod-1";
    
    // Toggle on
    useFavoritesStore.getState().toggleFavorite(productId);
    expect(useFavoritesStore.getState().isFavorite(productId)).toBe(true);

    // Toggle off
    useFavoritesStore.getState().toggleFavorite(productId);
    expect(useFavoritesStore.getState().isFavorite(productId)).toBe(false);
  });

  it("should store and retrieve variant info", () => {
    const productId = "prod-1";
    const variant = { color_name: "Red", variant_id: "v1" };
    
    useFavoritesStore.getState().addFavorite(productId, variant);
    
    expect(useFavoritesStore.getState().getFavoriteVariant(productId)).toEqual(variant);
  });

  it("should persist to localStorage", () => {
    const productId = "prod-1";
    useFavoritesStore.getState().addFavorite(productId);
    
    const stored = localStorage.getItem("product-favorites");
    expect(stored).toContain(productId);
  });
});
