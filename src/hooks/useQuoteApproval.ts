/**
 * useQuoteApproval — geração/consulta/revogação de links públicos de aprovação
 * de orçamento (lado do vendedor).
 *
 * O fluxo público (página /proposta/:token) usa `useQuoteApprovalToken`.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type ApprovalToken = Database["public"]["Tables"]["quote_approval_tokens"]["Row"];

export interface GenerateApprovalLinkResult {
  token: ApprovalToken;
  link: string;
}

export function useQuoteApproval() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const buildLink = (token: string) => `${window.location.origin}/proposta/${token}`;

  const generateApprovalLink = useCallback(
    async (
      quoteId: string,
      clientName?: string,
      clientEmail?: string,
    ): Promise<GenerateApprovalLinkResult | null> => {
      setIsGenerating(true);
      try {
        const { data, error } = await supabase
          .from("quote_approval_tokens")
          .insert({
            quote_id: quoteId,
            seller_id: user?.id ?? "",
            client_name: clientName ?? null,
            client_email: clientEmail ?? null,
            status: "pending",
          })
          .select()
          .single();

        if (error || !data) throw error ?? new Error("Falha ao gerar link de aprovação");

        const token = data as ApprovalToken;
        toast.success("Link de aprovação gerado");
        return { token, link: buildLink(token.token) };
      } catch {
        toast.error("Erro ao gerar link de aprovação");
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [user?.id],
  );

  const getApprovalStatus = useCallback(async (quoteId: string): Promise<ApprovalToken | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quote_approval_tokens")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as ApprovalToken | null) ?? null;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const revokeToken = useCallback(async (tokenId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("quote_approval_tokens")
        .update({ status: "revoked" })
        .eq("id", tokenId);

      if (error) throw error;
      toast.success("Link revogado");
      return true;
    } catch {
      toast.error("Erro ao revogar link");
      return false;
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  }, []);

  return {
    generateApprovalLink,
    getApprovalStatus,
    revokeToken,
    copyToClipboard,
    isLoading,
    isGenerating,
  };
}
