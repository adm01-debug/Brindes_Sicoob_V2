import { useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoritesStore, type FavoriteVariantInfo } from "@/stores/useFavoritesStore";
import { useFavoriteLists } from "@/hooks/useFavoriteLists";
import type { Product } from "@/types/product-catalog";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

const LAST_LIST_KEY = "favorites-last-used-list-id";
const FAVORITE_MEMBERSHIP_QUERY_KEY = "favorite-membership";

function membershipMap(rows: Array<{ product_id: string; list_id: string }>) {
  const result = new Map<string, Set<string>>();
  for (const row of rows) {
    const lists = result.get(row.product_id) ?? new Set<string>();
    lists.add(row.list_id);
    result.set(row.product_id, lists);
  }
  return result;
}

function preferredListId(
  forceListId: string | undefined,
  lastUsedListId: string | null,
  lists: Array<{ id: string }>,
  defaultList: { id: string } | null | undefined,
) {
  if (forceListId) return forceListId;
  if (lastUsedListId && lists.some((list) => list.id === lastUsedListId)) return lastUsedListId;
  return defaultList?.id ?? null;
}

async function persistFavorite(
  userId: string,
  listId: string,
  product: Product,
  variant?: FavoriteVariantInfo,
) {
  const { error } = await supabase.from("favorite_items").upsert(
    {
      list_id: listId,
      user_id: userId,
      product_id: product.id,
      variant_id: variant?.variant_id ?? null,
      variant_info: (variant ?? null) as never,
      price_at_save: typeof product.price === "number" ? product.price : null,
    },
    { onConflict: "list_id,product_id,variant_id", ignoreDuplicates: false },
  );
  if (error) throw error;
}

function saveLastListId(listId: string) {
  try {
    localStorage.setItem(LAST_LIST_KEY, listId);
  } catch (error) {
    logger.warn("Não foi possível salvar a última lista de favoritos", error);
  }
}

function handleAddFailure({
  productId,
  addedLocally,
  existsRemotely,
  latest,
  error,
}: {
  productId: string;
  addedLocally: boolean;
  existsRemotely: boolean;
  latest: boolean;
  error: unknown;
}) {
  if (!latest) return;
  const store = useFavoritesStore.getState();
  if (addedLocally && !existsRemotely && store.isFavorite(productId)) {
    store.removeFavorite(productId);
  }
  toast.error(error instanceof Error ? error.message : "Erro ao salvar");
}

function handleRemoveFailure({
  productId,
  previousVariant,
  existsRemotely,
  latest,
  error,
}: {
  productId: string;
  previousVariant: FavoriteVariantInfo | undefined;
  existsRemotely: boolean;
  latest: boolean;
  error: unknown;
}) {
  if (!latest) return;
  const store = useFavoritesStore.getState();
  if (existsRemotely && !store.isFavorite(productId)) {
    store.addFavorite(productId, previousVariant);
  }
  console.warn("[favoriteQuickAdd] remove failed", error);
}

type FavoriteDecision = "local" | "remove" | "add" | "picker";
interface FavoriteClickOptions {
  shiftKey?: boolean;
  variant?: FavoriteVariantInfo;
  forceListId?: string;
}

function normalizedFavoriteOptions(options: FavoriteClickOptions | undefined) {
  return {
    shiftKey: Boolean(options?.shiftKey),
    variant: options?.variant,
    forceListId: options?.forceListId,
  };
}

function favoriteDecision(
  authenticated: boolean,
  alreadyFavorite: boolean,
  forceList: boolean,
  directAdd: boolean,
): FavoriteDecision {
  if (!authenticated) return "local";
  if (alreadyFavorite) return "remove";
  if (forceList || directAdd) return "add";
  return "picker";
}

/**
 * Hook orquestrador para favoritar a partir do catálogo.
 *
 * Lógica:
 * - Se usuário NÃO tem listas remotas além da padrão → usa store legacy + grava em default remoto silenciosamente.
 * - Se usuário tem ≥2 listas e shift NÃO foi pressionado → retorna `needsPicker=true` para abrir QuickListPicker.
 * - Shift+click ou única lista → adiciona direto à lista padrão (ou última usada).
 */
export function useFavoriteQuickAdd() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { lists, defaultList, createList } = useFavoriteLists();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const productMutationTails = useRef(new Map<string, Promise<void>>());
  const productMutationVersions = useRef(new Map<string, number>());
  const productRemoteStates = useRef(new Map<string, boolean>());

  const enqueueProductMutation = useCallback(async (
    productId: string,
    mutation: (isLatest: () => boolean) => Promise<void>,
  ) => {
    const version = (productMutationVersions.current.get(productId) ?? 0) + 1;
    productMutationVersions.current.set(productId, version);
    const previous = productMutationTails.current.get(productId) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(() => mutation(() => productMutationVersions.current.get(productId) === version));
    productMutationTails.current.set(productId, current);
    try {
      await current;
    } finally {
      if (productMutationTails.current.get(productId) === current) {
        productMutationTails.current.delete(productId);
        productMutationVersions.current.delete(productId);
        productRemoteStates.current.delete(productId);
      }
    }
  }, []);

  // Index global de membership: produto X está em quais listas?
  const { data: membership = new Map<string, Set<string>>() } = useQuery({
    queryKey: [FAVORITE_MEMBERSHIP_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return new Map<string, Set<string>>();
      const { data, error } = await supabase
        .from("favorite_items")
        .select("product_id, list_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return membershipMap(data ?? []);
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const lastUsedListId = useMemo(() => {
    try { return localStorage.getItem(LAST_LIST_KEY); } catch { return null; }
  }, []);

  const hasMultipleLists = lists.length > 1;

  const rememberRemoteState = useCallback((productId: string, localFallback: boolean) => {
    if (!productRemoteStates.current.has(productId)) {
      productRemoteStates.current.set(productId, membership.has(productId) || localFallback);
    }
  }, [membership]);

  /** Adiciona produto remotamente em uma lista específica + registra no store legado (sync local). */
  const addToList = useCallback(
    async (listId: string, product: Product, variant?: FavoriteVariantInfo) => {
      if (!user) return;
      // A interação visual e a cópia local são imediatas. A persistência
      // remota não deve congelar o coração do catálogo em redes lentas.
      const addedLocally = !isFavorite(product.id);
      rememberRemoteState(product.id, !addedLocally);
      if (addedLocally) toggleFavorite(product.id, variant);
      await enqueueProductMutation(product.id, async (isLatest) => {
        try {
          await persistFavorite(user.id, listId, product, variant);
          productRemoteStates.current.set(product.id, true);
          saveLastListId(listId);
          qc.invalidateQueries({ queryKey: [FAVORITE_MEMBERSHIP_QUERY_KEY] });
          qc.invalidateQueries({ queryKey: ["favorite-items"] });
          qc.invalidateQueries({ queryKey: ["favorite-lists"] });
          const listName = lists.find((l) => l.id === listId)?.name ?? "lista";
          if (isLatest()) toast.success(`Adicionado em "${listName}"`);
        } catch (e) {
          const existsRemotely = productRemoteStates.current.get(product.id) ?? false;
          handleAddFailure({
            productId: product.id,
            addedLocally,
            existsRemotely,
            latest: isLatest(),
            error: e,
          });
        }
      });
    },
    [user, qc, lists, isFavorite, toggleFavorite, enqueueProductMutation, rememberRemoteState]
  );

  /** Remove produto de TODAS as listas remotas + store legado. */
  const removeFromAll = useCallback(
    async (productId: string) => {
      if (!user) return;
      // Mantém a experiência local responsiva; a sincronização com a nuvem
      // acontece em segundo plano e reverte o estado se o banco a rejeitar.
      const previousVariant = useFavoritesStore.getState().getFavoriteVariant(productId);
      const removedLocally = isFavorite(productId);
      rememberRemoteState(productId, removedLocally);
      if (removedLocally) toggleFavorite(productId);
      await enqueueProductMutation(productId, async (isLatest) => {
        try {
          const { error } = await supabase
            .from("favorite_items")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", productId);
          if (error) throw error;
          productRemoteStates.current.set(productId, false);
          qc.invalidateQueries({ queryKey: [FAVORITE_MEMBERSHIP_QUERY_KEY] });
          qc.invalidateQueries({ queryKey: ["favorite-items"] });
          qc.invalidateQueries({ queryKey: ["favorite-lists"] });
        } catch (e) {
          const existsRemotely = productRemoteStates.current.get(productId) ?? removedLocally;
          handleRemoveFailure({
            productId,
            previousVariant,
            existsRemotely,
            latest: isLatest(),
            error: e,
          });
        }
      });
    },
    [user, qc, isFavorite, toggleFavorite, enqueueProductMutation, rememberRemoteState]
  );

  /** Cria lista nova e adiciona o produto nela. */
  const createAndAdd = useCallback(
    async (name: string, product: Product, variant?: FavoriteVariantInfo) => {
      const list = await createList.mutateAsync({ name });
      await addToList(list.id, product, variant);
      return list.id;
    },
    [createList, addToList]
  );

  /**
   * Decide o destino e age.
   * @returns true se a ação foi resolvida, false se precisa abrir o picker.
   */
  const handleFavoriteClick = useCallback(
    (
      product: Product,
      opts?: FavoriteClickOptions,
    ): { resolved: true } | { resolved: false; reason: "picker-needed" } => {
      const options = normalizedFavoriteOptions(opts);
      const alreadyFav = isFavorite(product.id);
      const targetListId = preferredListId(options.forceListId, lastUsedListId, lists, defaultList);
      const decision = favoriteDecision(Boolean(user), alreadyFav, Boolean(options.forceListId), !hasMultipleLists || options.shiftKey);
      if (decision === "picker") return { resolved: false, reason: "picker-needed" };
      if (decision === "remove") void removeFromAll(product.id);
      if (decision === "add" && targetListId) void addToList(targetListId, product, options.variant);
      if (decision === "local" || (decision === "add" && !targetListId)) toggleFavorite(product.id, options.variant);
      return { resolved: true };
    },
    [user, isFavorite, hasMultipleLists, lastUsedListId, defaultList, lists, toggleFavorite, removeFromAll, addToList]
  );

  return {
    lists,
    defaultList,
    membership,
    hasMultipleLists,
    handleFavoriteClick,
    addToList,
    removeFromAll,
    createAndAdd,
    isFavorite,
  };
}
