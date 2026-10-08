import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const KIT_SHARE_TOKENS_QUERY_KEY = "kit-share-tokens";
const KIT_SHARE_SUMMARY_QUERY_KEY = "kit-share-summary";

function requireIdentifier(value: string | undefined, entity: string): string {
  if (!value) throw new Error(`${entity} não identificado`);
  return value;
}

export interface KitShareToken {
  id: string;
  kit_id: string;
  seller_id: string;
  token: string;
  client_name: string | null;
  client_email: string | null;
  status: string;
  expires_at: string | null;
  viewed_at: string | null;
  created_at: string;
}

export function useKitShare() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const generateShareLink = useCallback(async (
    kitId: string,
    clientName?: string,
    clientEmail?: string,
  ): Promise<string | null> => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }

    setIsLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase
        .from("kit_share_tokens")
        .insert({
          kit_id: kitId,
          seller_id: user.id,
          client_name: clientName || null,
          client_email: clientEmail || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/kit/${(data as Record<string, string>).token}`;
      toast.success("Link de apresentação gerado!");
      qc.invalidateQueries({ queryKey: [KIT_SHARE_TOKENS_QUERY_KEY, kitId] });
      qc.invalidateQueries({ queryKey: [KIT_SHARE_SUMMARY_QUERY_KEY] });
      return link;
    } catch (err) {
      console.error("Error generating share link:", err);
      toast.error("Erro ao gerar link de apresentação");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, qc]);

  const revokeShareLink = useCallback(async (tokenId: string, kitId?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("kit_share_tokens")
        .update({ status: "revoked" })
        .eq("id", tokenId);

      if (error) throw error;
      toast.success("Link revogado");
      if (kitId) qc.invalidateQueries({ queryKey: [KIT_SHARE_TOKENS_QUERY_KEY, kitId] });
      qc.invalidateQueries({ queryKey: [KIT_SHARE_SUMMARY_QUERY_KEY] });
      return true;
    } catch (err) {
      console.error("Error revoking token:", err);
      toast.error("Erro ao revogar link");
      return false;
    }
  }, [qc]);

  return { generateShareLink, revokeShareLink, isLoading };
}

/**
 * Lista tokens de compartilhamento de um kit específico.
 * Usado no `KitShareLinkDialog` (aba Links).
 */
export function useKitShareTokens(kitId: string | undefined) {
  return useQuery({
    queryKey: [KIT_SHARE_TOKENS_QUERY_KEY, kitId],
    enabled: !!kitId,
    queryFn: async () => {
      const requiredKitId = requireIdentifier(kitId, "Kit");
      const { data, error } = await supabase
        .from("kit_share_tokens")
        .select("*")
        .eq("kit_id", requiredKitId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as KitShareToken[];
    },
  });
}

/**
 * Resumo agregado de share tokens do usuário autenticado.
 * Devolve um Map<kitId, { generated, viewed, lastViewedAt }>.
 * Usado para badges "visualizado pelo cliente" em `KitCard`.
 */
export interface KitShareSummary {
  generated: number;
  viewed: number;
  lastViewedAt: string | null;
}

export function useKitShareSummary() {
  const { user } = useAuth();
  const authenticatedUserId = user?.id;
  return useQuery({
    queryKey: [KIT_SHARE_SUMMARY_QUERY_KEY, authenticatedUserId],
    enabled: !!authenticatedUserId,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, KitShareSummary>> => {
      const userId = requireIdentifier(authenticatedUserId, "Usuário");
      const { data, error } = await supabase
        .from("kit_share_tokens")
        .select("kit_id, viewed_at, status")
        .eq("seller_id", userId);
      if (error) throw error;
      const map: Record<string, KitShareSummary> = {};
      for (const row of (data || []) as Array<{ kit_id: string; viewed_at: string | null; status: string }>) {
        const cur = map[row.kit_id] || { generated: 0, viewed: 0, lastViewedAt: null };
        if (row.status === "active" || row.status === "revoked") cur.generated += 1;
        if (row.viewed_at) {
          cur.viewed += 1;
          if (!cur.lastViewedAt || row.viewed_at > cur.lastViewedAt) {
            cur.lastViewedAt = row.viewed_at;
          }
        }
        map[row.kit_id] = cur;
      }
      return map;
    },
  });
}
