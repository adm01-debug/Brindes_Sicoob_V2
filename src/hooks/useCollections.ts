import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type Product } from "@/hooks/useProducts";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

const LEGACY_STORAGE_KEY = "product-collections";

export interface CollectionVariantInfo {
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  variant_id?: string | null;
  thumbnail?: string | null;
}

export interface CollectionProductItem {
  productId: string;
  variant?: CollectionVariantInfo;
  notes?: string;
  priceAtSave?: number | null;
  addedAt?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isFeatured: boolean;
  clientId?: string | null;
  clientName?: string | null;
  shareToken?: string | null;
  shareExpiresAt?: string | null;
  isPublic?: boolean;
  /** @deprecated Use productItems instead */
  productIds: string[];
  productItems: CollectionProductItem[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_COLORS = [
  "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#3B82F6", "#EF4444", "#6366F1", "#14B8A6",
];

const DEFAULT_ICONS = ["📁", "⭐", "🎁", "💼", "🎯", "💡", "🔥", "❤️"];

function collectionItemVariant(item: Tables<"collection_items">): CollectionVariantInfo | undefined {
  if (!item.color_name && !item.color_hex && !item.thumbnail_url) return undefined;
  return { color_name: item.color_name, color_hex: item.color_hex, thumbnail: item.thumbnail_url };
}

function collectionColor(row: Tables<"collections">): string {
  return row.icon_color || DEFAULT_COLORS[0] || "#8B5CF6";
}

/** Convert DB rows to Collection interface */
function dbToCollection(
  row: Tables<"collections">,
  items: Tables<"collection_items">[]
): Collection {
  const productItems: CollectionProductItem[] = items.map((item) => ({
    productId: item.product_id,
    variant: collectionItemVariant(item),
    notes: item.notes || undefined,
    priceAtSave: item.price_at_save ?? null,
    addedAt: item.created_at ?? null,
  }));

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    color: collectionColor(row),
    icon: row.icon || "📁",
    isFeatured: row.is_featured ?? false,
    clientId: row.client_id ?? null,
    clientName: row.client_name ?? null,
    shareToken: row.share_token ?? null,
    shareExpiresAt: row.share_expires_at ?? null,
    isPublic: row.is_public ?? false,
    productIds: productItems.map((i) => i.productId),
    productItems,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function legacyItems(collection: Partial<Collection>): CollectionProductItem[] {
  if (collection.productItems?.length) return collection.productItems;
  return (collection.productIds ?? []).map((productId) => ({ productId }));
}

async function insertLegacyCollection(userId: string, collection: Partial<Collection>): Promise<void> {
  if (!collection.name) return;
  const { data: newCollection } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      name: collection.name,
      description: collection.description || null,
      is_featured: false,
      icon_color: collection.color || DEFAULT_COLORS[0],
    })
    .select()
    .single();
  if (!newCollection) return;

  const items = legacyItems(collection);
  if (items.length === 0) return;
  await supabase.from("collection_items").insert(
    items.map((item, index) => ({
      collection_id: newCollection.id,
      product_id: item.productId,
      color_name: item.variant?.color_name || null,
      color_hex: item.variant?.color_hex || null,
      thumbnail_url: item.variant?.thumbnail || null,
      sort_order: index,
    }))
  );
}

async function migrateLegacyCollections(userId: string): Promise<void> {
  const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) return;
  const legacyCollections: unknown = JSON.parse(stored);
  if (!Array.isArray(legacyCollections) || legacyCollections.length === 0) return;

  const { count } = await supabase
    .from("collections")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count === 0) {
    for (const candidate of legacyCollections) {
      if (!candidate || typeof candidate !== "object") continue;
      await insertLegacyCollection(userId, candidate as Partial<Collection>);
    }
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

interface NewCollectionInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  clientId?: string | null;
  clientName?: string | null;
}

function buildNewCollection(input: NewCollectionInput): Collection {
  const now = new Date().toISOString();
  return {
    id: `temp-${Date.now()}`,
    name: input.name,
    description: input.description,
    color: input.color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)] || "#8B5CF6",
    icon: input.icon || DEFAULT_ICONS[0] || "📁",
    isFeatured: false,
    clientId: input.clientId ?? null,
    clientName: input.clientName ?? null,
    productIds: [],
    productItems: [],
    createdAt: now,
    updatedAt: now,
  };
}

function buildCollectionContentUpdates(
  updates: Partial<Omit<Collection, "id" | "createdAt">>,
): TablesUpdate<"collections"> {
  const result: TablesUpdate<"collections"> = {};
  if (updates.name !== undefined) result.name = updates.name;
  if (updates.description !== undefined) result.description = updates.description;
  if (updates.color !== undefined) result.icon_color = updates.color;
  if (updates.icon !== undefined) result.icon = updates.icon;
  if (updates.isFeatured !== undefined) result.is_featured = updates.isFeatured;
  return result;
}

function buildCollectionSharingUpdates(
  updates: Partial<Omit<Collection, "id" | "createdAt">>,
): TablesUpdate<"collections"> {
  const result: TablesUpdate<"collections"> = {};
  if (updates.clientId !== undefined) result.client_id = updates.clientId;
  if (updates.clientName !== undefined) result.client_name = updates.clientName;
  if (updates.shareToken !== undefined) result.share_token = updates.shareToken;
  if (updates.shareExpiresAt !== undefined) result.share_expires_at = updates.shareExpiresAt;
  if (updates.isPublic !== undefined) result.is_public = updates.isPublic;
  return result;
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();

  // Load collections from DB
  const loadCollections = useCallback(async () => {
    if (!user?.id) return;

    const { data: colRows, error } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading collections:", error);
      setIsLoaded(true);
      return;
    }

    if (!colRows || colRows.length === 0) {
      setCollections([]);
      setIsLoaded(true);
      return;
    }

    // Load all items for user's collections
    const colIds = colRows.map((c) => c.id);
    const { data: itemRows } = await supabase
      .from("collection_items")
      .select("*")
      .in("collection_id", colIds)
      .order("sort_order", { ascending: true });

    const itemsByCollection = new Map<string, Tables<"collection_items">[]>();
    (itemRows || []).forEach((item) => {
      const list = itemsByCollection.get(item.collection_id) || [];
      list.push(item);
      itemsByCollection.set(item.collection_id, list);
    });

    const mapped = colRows.map((row) =>
      dbToCollection(row, itemsByCollection.get(row.id) || [])
    );

    setCollections(mapped);
    setIsLoaded(true);
  }, [user?.id]);

  // Migrate localStorage data on first load
  useEffect(() => {
    if (!user?.id) return;

    const migrateAndLoad = async () => {
      try {
        await migrateLegacyCollections(user.id);
      } catch (e) {
        console.error("Error migrating collections:", e);
      }

      await loadCollections();
    };

    migrateAndLoad();
  }, [user?.id, loadCollections]);

  const createCollection = useCallback(
    (name: string, ...options: [description?: string, color?: string, icon?: string, clientId?: string | null, clientName?: string | null]): Collection => {
      const [description, color, icon, clientId, clientName] = options;
      const newCollection = buildNewCollection({ name, description, color, icon, clientId, clientName });

      // Optimistic update
      setCollections((prev) => [newCollection, ...prev]);

      // Persist to DB
      if (user?.id) {
        supabase
          .from("collections")
          .insert({
            user_id: user.id,
            name,
            description: description || null,
            icon_color: newCollection.color,
            icon: newCollection.icon,
            client_id: clientId ?? null,
            client_name: clientName ?? null,
          })
          .select()
          .single()
          .then(({ data }) => {
            if (data) {
              setCollections((prev) =>
                prev.map((c) =>
                  c.id === newCollection.id
                    ? { ...c, id: data.id, createdAt: data.created_at, updatedAt: data.updated_at }
                    : c
                )
              );
            }
          });
      }

      return newCollection;
    },
    [user?.id]
  );

  const updateCollection = useCallback(
    (id: string, updates: Partial<Omit<Collection, "id" | "createdAt">>) => {
      setCollections((prev) =>
        prev.map((col) =>
          col.id === id
            ? { ...col, ...updates, updatedAt: new Date().toISOString() }
            : col
        )
      );

      // Persist
      const dbUpdates: TablesUpdate<"collections"> = {
        ...buildCollectionContentUpdates(updates),
        ...buildCollectionSharingUpdates(updates),
      };

      if (Object.keys(dbUpdates).length > 0) {
        supabase.from("collections").update(dbUpdates).eq("id", id).then();
      }
    },
    []
  );

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((col) => col.id !== id));
    supabase.from("collections").delete().eq("id", id).then();
  }, []);

  const addProductToCollection = useCallback(
    (collectionId: string, productId: string, variant?: CollectionVariantInfo, priceAtSave?: number | null) => {
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          if (col.productIds.includes(productId)) return col;
          return {
            ...col,
            productIds: [...col.productIds, productId],
            productItems: [...col.productItems, { productId, variant }],
            updatedAt: new Date().toISOString(),
          };
        })
      );

      supabase
        .from("collection_items")
        .insert({
          collection_id: collectionId,
          product_id: productId,
          color_name: variant?.color_name || null,
          color_hex: variant?.color_hex || null,
          thumbnail_url: variant?.thumbnail || null,
          price_at_save: priceAtSave ?? null,
          sort_order: 0,
        } as never)
        .then();
    },
    []
  );

  const restoreFromTrash = useCallback(async (collectionId: string, productId: string) => {
    const { data: trashed } = await supabase
      .from("collection_items_trash" as never)
      .select("*")
      .eq("collection_id", collectionId)
      .eq("product_id", productId)
      .order("deleted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!trashed) return false;
    const t = trashed as Record<string, unknown>;
    await supabase.from("collection_items").insert({
      collection_id: collectionId,
      product_id: productId,
      color_name: t.color_name ?? null,
      color_hex: t.color_hex ?? null,
      thumbnail_url: t.thumbnail_url ?? null,
      notes: t.notes ?? null,
      price_at_save: t.price_at_save ?? null,
      sort_order: t.sort_order ?? 0,
    } as never);
    await supabase.from("collection_items_trash" as never).delete().eq("id", t.id as string);
    await loadCollections();
    return true;
  }, [loadCollections]);

  const removeProductFromCollection = useCallback(
    (collectionId: string, productId: string) => {
      setCollections((prev) =>
        prev.map((col) =>
          col.id === collectionId
            ? {
                ...col,
                productIds: col.productIds.filter((id) => id !== productId),
                productItems: col.productItems.filter((item) => item.productId !== productId),
                updatedAt: new Date().toISOString(),
              }
            : col
        )
      );

      supabase
        .from("collection_items")
        .delete()
        .eq("collection_id", collectionId)
        .eq("product_id", productId)
        .then();
    },
    []
  );

  const addProductToMultipleCollections = useCallback(
    (productId: string, collectionIds: string[], variant?: CollectionVariantInfo) => {
      setCollections((prev) =>
        prev.map((col) => {
          if (collectionIds.includes(col.id) && !col.productIds.includes(productId)) {
            return {
              ...col,
              productIds: [...col.productIds, productId],
              productItems: [...col.productItems, { productId, variant }],
              updatedAt: new Date().toISOString(),
            };
          }
          return col;
        })
      );

      // Persist all
      const inserts = collectionIds.map((colId) => ({
        collection_id: colId,
        product_id: productId,
        color_name: variant?.color_name || null,
        color_hex: variant?.color_hex || null,
        thumbnail_url: variant?.thumbnail || null,
        sort_order: 0,
      }));

      supabase.from("collection_items").upsert(inserts, {
        onConflict: "collection_id,product_id,color_name",
      }).then();
    },
    []
  );

  const getCollectionProductVariant = useCallback(
    (collectionId: string, productId: string): CollectionVariantInfo | undefined => {
      const collection = collections.find((col) => col.id === collectionId);
      if (!collection) return undefined;
      const item = collection.productItems.find((i) => i.productId === productId);
      return item?.variant;
    },
    [collections]
  );

  const getCollectionProductItems = useCallback(
    (collectionId: string): CollectionProductItem[] => {
      const collection = collections.find((col) => col.id === collectionId);
      return collection?.productItems || [];
    },
    [collections]
  );

  const getCollectionProductsFromMap = useCallback(
    (
      collectionId: string,
      getProductsByIds: (ids: string[]) => Product[]
    ): Product[] => {
      const collection = collections.find((col) => col.id === collectionId);
      if (!collection) return [];
      return getProductsByIds(collection.productIds);
    },
    [collections]
  );

  const getProductCollections = useCallback(
    (productId: string): Collection[] =>
      collections.filter((col) => col.productIds.includes(productId)),
    [collections]
  );

  const isProductInCollection = useCallback(
    (productId: string, collectionId: string): boolean => {
      const collection = collections.find((col) => col.id === collectionId);
      return collection?.productIds.includes(productId) ?? false;
    },
    [collections]
  );

  const reorderProducts = useCallback(
    (collectionId: string, orderedProductIds: string[]) => {
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          const itemMap = new Map(col.productItems.map((item) => [item.productId, item]));
          const reordered = orderedProductIds
            .map((pid) => itemMap.get(pid))
            .filter(Boolean) as CollectionProductItem[];
          return {
            ...col,
            productIds: reordered.map((i) => i.productId),
            productItems: reordered,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      // Persist sort_order to DB
      orderedProductIds.forEach((pid, idx) => {
        supabase
          .from("collection_items")
          .update({ sort_order: idx })
          .eq("collection_id", collectionId)
          .eq("product_id", pid)
          .then();
      });
    },
    []
  );

  const updateProductNotes = useCallback(
    (collectionId: string, productId: string, notes: string) => {
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          return {
            ...col,
            productItems: col.productItems.map((item) =>
              item.productId === productId ? { ...item, notes } : item
            ),
          };
        })
      );

      supabase
        .from("collection_items")
        .update({ notes })
        .eq("collection_id", collectionId)
        .eq("product_id", productId)
        .then();
    },
    []
  );

  return {
    collections,
    isLoaded,
    createCollection,
    updateCollection,
    deleteCollection,
    addProductToCollection,
    removeProductFromCollection,
    addProductToMultipleCollections,
    reorderProducts,
    updateProductNotes,
    restoreFromTrash,
    getCollectionProductsFromMap,
    getCollectionProductItems,
    getCollectionProductVariant,
    getProductCollections,
    isProductInCollection,
    defaultColors: DEFAULT_COLORS,
    defaultIcons: DEFAULT_ICONS,
  };
}
