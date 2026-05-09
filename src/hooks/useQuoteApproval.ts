import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Quote } from "./quotes/quoteTypes";
import { toast } from "sonner";

export function useQuoteApproval(token: string) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [approvalData, setApprovalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovalData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // Usar a edge function para validar o token e retornar os dados do orçamento
      // Isso garante segurança (não expõe RLS do orçamento para o público sem token válido)
      const { data, error: fnError } = await supabase.functions.invoke("quote-approval", {
        body: { action: "get_data", token },
      });

      if (fnError) throw fnError;

      setQuote(data.quote);
      setApprovalData(data.approval);
      
      // Registrar visualização
      if (data.approval.status === 'pending') {
        await supabase.from('quote_approval_tokens')
          .update({ viewed_at: new Date().toISOString() })
          .eq('token', token);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar orçamento");
      console.error("Erro ao carregar aprovação:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const respondToQuote = async (status: 'approved' | 'rejected', notes?: string, signerData?: any) => {
    setIsLoading(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("quote-approval", {
        body: { 
          action: "respond", 
          token, 
          status, 
          notes,
          signer: signerData 
        },
      });

      if (fnError) throw fnError;

      toast.success(status === 'approved' ? "Orçamento aprovado com sucesso!" : "Resposta enviada.");
      await fetchApprovalData();
      return true;
    } catch (err: any) {
      toast.error("Erro ao enviar resposta");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalData();
  }, [token]);

  return {
    quote,
    approvalData,
    isLoading,
    error,
    respondToQuote,
    refresh: fetchApprovalData
  };
}
