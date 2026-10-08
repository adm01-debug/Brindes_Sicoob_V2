/**
 * useComparisonSync — Persistência cross-device da comparação atual.
 * - localStorage continua sendo a fonte primária (offline-first)
 * - Quando logado, faz upsert em user_comparisons (sem share_token, slot "current")
 * - Faz merge inteligente ao logar: união (max 4) com base no localStorage
 */
import { useEffect, useRef } from "react";
import { useComparisonStore, type CompareItem } from "@/stores/useComparisonStore";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const CURRENT_SLOT_KEY = "current"; // marker no campo client_name para o slot "atual"

function comparisonKey(item: CompareItem): string {
  return item.variant?.variant_id
    ? `${item.productId}::${item.variant.variant_id}`
    : item.productId;
}

function mergeComparisonItems(local: CompareItem[], remote: CompareItem[]): CompareItem[] {
  const seen = new Set<string>();
  const merged: CompareItem[] = [];
  for (const item of [...local, ...remote]) {
    const key = comparisonKey(item);
    if (seen.has(key) || merged.length >= 4) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function applyMergedComparison(local: CompareItem[], merged: CompareItem[]): void {
  if (JSON.stringify(merged) === JSON.stringify(local)) return;
  useComparisonStore.setState({
    compareItems: merged,
    compareIds: merged.map((item) => item.productId),
    compareCount: merged.length,
    canAddMore: merged.length < 4,
  });
}

async function fetchRemoteComparison(userId: string): Promise<CompareItem[]> {
  const { data: rows } = await supabase
    .from("user_comparisons")
    .select("id, items, updated_at")
    .eq("user_id", userId)
    .eq("client_name", CURRENT_SLOT_KEY)
    .is("share_token", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  return (rows?.[0]?.items as CompareItem[] | undefined) ?? [];
}

async function hydrateComparison(
  isMounted: () => boolean,
  userIdRef: { current: string | null },
  hydratedRef: { current: boolean },
): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? null;
  if (!isMounted() || !userId) return;
  userIdRef.current = userId;

  try {
    const remote = await fetchRemoteComparison(userId);
    const local = useComparisonStore.getState().compareItems;
    applyMergedComparison(local, mergeComparisonItems(local, remote));
  } catch (error) {
    console.warn("[useComparisonSync] hydrate failed", error);
  } finally {
    hydratedRef.current = true;
  }
}

export function useComparisonSync() {
  const { compareItems } = useComparisonStore();
  const hydratedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // Hidratação inicial ao logar
  useEffect(() => {
    let mounted = true;
    void hydrateComparison(() => mounted, userIdRef, hydratedRef);
    return () => { mounted = false; };
  }, []);

  // Upsert com debounce ao mudar
  useEffect(() => {
    if (!hydratedRef.current || !userIdRef.current) return;
    const userId = userIdRef.current;
    const t = setTimeout(async () => {
      try {
        // Busca registro existente do slot "current"
        const { data: existing } = await supabase
          .from("user_comparisons")
          .select("id")
          .eq("user_id", userId)
          .eq("client_name", CURRENT_SLOT_KEY)
          .is("share_token", null)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("user_comparisons")
            .update({ items: compareItems as unknown as Json, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else if (compareItems.length > 0) {
          await supabase
            .from("user_comparisons")
            .insert({
              user_id: userId,
              client_name: CURRENT_SLOT_KEY,
              items: compareItems as unknown as Json,
              is_public: false,
            });
        }
      } catch (e) {
        console.warn("[useComparisonSync] upsert failed", e);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [compareItems]);
}
