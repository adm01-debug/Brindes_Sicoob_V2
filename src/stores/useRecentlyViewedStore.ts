import { create } from "zustand";

const STORAGE_KEY_PREFIX = "recently-viewed-products:";
const LEGACY_STORAGE_KEY = "recently-viewed-products";
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  productId: string;
  viewedAt: string;
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  isLoaded: boolean;
  scopeKey: string | null;
}

interface RecentlyViewedActions {
  addToRecentlyViewed: (productId: string) => void;
  removeFromRecentlyViewed: (productId: string) => void;
  clearRecentlyViewed: () => void;
  setScope: (scopeKey: string | null) => void;
  reset: () => void;
}

interface RecentlyViewedStore extends RecentlyViewedState, RecentlyViewedActions {
  itemCount: number;
}

function storageKey(scopeKey: string): string {
  return `${STORAGE_KEY_PREFIX}${encodeURIComponent(scopeKey)}`;
}

function loadFromStorage(scopeKey: string): RecentlyViewedItem[] {
  try {
    const stored = localStorage.getItem(storageKey(scopeKey));
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function saveToStorage(scopeKey: string | null, items: RecentlyViewedItem[]) {
  if (!scopeKey) return;
  try {
    localStorage.setItem(storageKey(scopeKey), JSON.stringify(items));
  } catch {
    // silently fail
  }
}

// Debounce tracking to prevent duplicate rapid additions
let lastAddedId: string | null = null;
let lastAddedTimer: ReturnType<typeof setTimeout> | null = null;

export const useRecentlyViewedStore = create<RecentlyViewedStore>((set, get) => {
  return {
    items: [],
    itemCount: 0,
    isLoaded: true,
    scopeKey: null,

    setScope: (scopeKey: string | null) => {
      if (get().scopeKey === scopeKey) return;
      if (lastAddedTimer) clearTimeout(lastAddedTimer);
      lastAddedTimer = null;
      lastAddedId = null;
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // O estado em memória ainda é isolado mesmo sem acesso ao storage.
      }
      const items = scopeKey ? loadFromStorage(scopeKey) : [];
      set({ scopeKey, items, itemCount: items.length, isLoaded: true });
    },

    addToRecentlyViewed: (productId: string) => {
      const scopeKey = get().scopeKey;
      if (!scopeKey) return;
      if (lastAddedId === productId) return;
      lastAddedId = productId;
      if (lastAddedTimer) clearTimeout(lastAddedTimer);
      lastAddedTimer = setTimeout(() => {
        lastAddedId = null;
      }, 1000);

      const { items } = get();
      const filtered = items.filter((item) => item.productId !== productId);
      const next = [
        { productId, viewedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      saveToStorage(scopeKey, next);
      set({ items: next, itemCount: next.length });
    },

    removeFromRecentlyViewed: (productId: string) => {
      const next = get().items.filter((item) => item.productId !== productId);
      saveToStorage(get().scopeKey, next);
      set({ items: next, itemCount: next.length });
    },

    clearRecentlyViewed: () => {
      saveToStorage(get().scopeKey, []);
      set({ items: [], itemCount: 0 });
    },

    reset: () => {
      if (lastAddedTimer) clearTimeout(lastAddedTimer);
      lastAddedTimer = null;
      lastAddedId = null;
      try {
        const currentScope = get().scopeKey;
        if (currentScope) localStorage.removeItem(storageKey(currentScope));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // O reset em memória é obrigatório mesmo se o navegador negar storage.
      }
      set({ items: [], itemCount: 0, scopeKey: null, isLoaded: true });
    },
  };
});
