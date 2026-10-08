/**
 * useFavoriteReactions — hook leve para registrar reactions anônimas no public list page.
 * Anon ID é mantido em cookie/localStorage por 30 dias.
 */
import {  useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "fav-anon-id";

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now().toString(36);
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

export interface ReactionRow {
  id: string;
  item_id: string;
  emoji: string;
  anon_id: string;
  created_at: string;
}

/** Para a página pública: lê + envia reactions. */
export function useFavoriteReactions(listId: string | null, listToken: string | null) {
  const qc = useQueryClient();
  const [anonId] = useState<string>(() => getAnonId());

  const reactionsQuery = useQuery({
    queryKey: ["fav-reactions", listId],
    queryFn: async (): Promise<ReactionRow[]> => {
      if (!listId) return [];
      const { data, error } = await supabase
        .from("favorite_item_reactions")
        .select("id, item_id, emoji, anon_id, created_at")
        .eq("list_id", listId);
      if (error) throw error;
      return (data ?? []) as ReactionRow[];
    },
    enabled: !!listId,
    staleTime: 10_000,
  });

  const react = useMutation({
    mutationFn: async ({ itemId, emoji }: { itemId: string; emoji: "👍" | "❤️" | "🔥" | "💡" }) => {
      if (!listToken) throw new Error("Lista não está pública");
      const url = `https://cfmzkthhgliqelozlmwu.supabase.co/functions/v1/favorites-public-react`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_token: listToken, item_id: itemId, emoji, anon_id: anonId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fav-reactions", listId] });
    },
  });

  return {
    reactions: reactionsQuery.data ?? [],
    isLoading: reactionsQuery.isLoading,
    react,
    anonId,
  };
}

/** Para o vendedor: lê apenas as reactions agregadas por item da própria lista. */
export function useMyListReactions(listId: string | null) {
  return useQuery({
    queryKey: ["fav-reactions-owner", listId],
    queryFn: async (): Promise<Map<string, Record<string, number>>> => {
      if (!listId) return new Map();
      const { data, error } = await supabase
        .from("favorite_item_reactions")
        .select("item_id, emoji")
        .eq("list_id", listId);
      if (error) throw error;
      const map = new Map<string, Record<string, number>>();
      (data ?? []).forEach((r: { item_id: string; emoji: string }) => {
        const cur = map.get(r.item_id) ?? {};
        cur[r.emoji] = (cur[r.emoji] ?? 0) + 1;
        map.set(r.item_id, cur);
      });
      return map;
    },
    enabled: !!listId,
    staleTime: 30_000,
  });
}
