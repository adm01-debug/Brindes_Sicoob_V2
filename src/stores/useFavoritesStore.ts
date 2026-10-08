import { create } from "zustand";
import { Haptics } from "@/utils/haptics";
import { logger } from "@/lib/logger";

const STORAGE_KEY = "product-favorites";

export interface FavoriteVariantInfo {
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  variant_id?: string | null;
  thumbnail?: string | null;
}

export interface FavoriteItem {
  productId: string;
  addedAt: string;
  variant?: FavoriteVariantInfo;
}

interface FavoritesState {
  favorites: FavoriteItem[];
  isLoaded: boolean;
}

interface FavoritesActions {
  addFavorite: (productId: string, variant?: FavoriteVariantInfo) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (productId: string, variant?: FavoriteVariantInfo) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
  getFavoriteVariant: (productId: string) => FavoriteVariantInfo | undefined;
}

interface FavoritesStore extends FavoritesState, FavoritesActions {
  favoriteCount: number;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidVariant(value: unknown): boolean {
  return value === undefined || (typeof value === "object" && value !== null && !Array.isArray(value));
}

function isFavoriteItem(value: unknown): value is FavoriteItem {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const item = value as Partial<FavoriteItem>;
  return isNonEmptyString(item.productId)
    && isNonEmptyString(item.addedAt)
    && isValidVariant(item.variant);
}

function parseStoredFavorites(raw: string): FavoriteItem[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isFavoriteItem)) {
    throw new TypeError("O armazenamento de favoritos contém um payload inválido");
  }
  return parsed;
}

function loadFromStorage(): FavoriteItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseStoredFavorites(stored) : [];
  } catch (error) {
    logger.error("Error loading favorites:", error);
    return [];
  }
}

function saveToStorage(items: FavoriteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // silently fail
  }
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => {
  const initial = loadFromStorage();
  return {
    favorites: initial,
    favoriteCount: initial.length,
    isLoaded: true,

    addFavorite: (productId: string, variant?: FavoriteVariantInfo) => {
      const { favorites } = get();
      if (favorites.some((f) => f.productId === productId)) return;
      const next = [...favorites, { productId, addedAt: new Date().toISOString(), variant }];
      saveToStorage(next);
      set({ favorites: next, favoriteCount: next.length });
      Haptics.notificationSuccess();
    },

    removeFavorite: (productId: string) => {
      const next = get().favorites.filter((f) => f.productId !== productId);
      saveToStorage(next);
      set({ favorites: next, favoriteCount: next.length });
      Haptics.impactLight();
    },

    toggleFavorite: (productId: string, variant?: FavoriteVariantInfo) => {
      const { favorites } = get();
      const exists = favorites.some((f) => f.productId === productId);
      const next = exists
        ? favorites.filter((f) => f.productId !== productId)
        : [...favorites, { productId, addedAt: new Date().toISOString(), variant }];
      saveToStorage(next);
      set({ favorites: next, favoriteCount: next.length });
      
      if (exists) {
        Haptics.impactLight();
      } else {
        Haptics.notificationSuccess();
      }
    },

    isFavorite: (productId: string) =>
      get().favorites.some((f) => f.productId === productId),

    getFavoriteVariant: (productId: string) =>
      get().favorites.find((f) => f.productId === productId)?.variant,

    clearFavorites: () => {
      saveToStorage([]);
      set({ favorites: [], favoriteCount: 0 });
      Haptics.impactMedium();
    },
  };
});
