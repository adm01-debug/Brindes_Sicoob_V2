/**
 * useQuotes — Hook de orçamentos (refatorado)
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSalesScope } from "@/lib/auth/visibility-scope";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";
import { toast } from "sonner";
import { QuoteService } from "@/services/QuoteService";
import { ensureQuoteMutationApplied, ensureQuotesAreAccessible } from "./quoteStatusMutationGuards";
import type { Quote, QuoteItem, PersonalizationTechnique } from "./quoteTypes";
// Re-export the canonical quote types so consumers can import them from this hook.
export type { Quote, QuoteItem, QuoteItemPersonalization, PersonalizationTechnique } from "./quoteTypes";
import { invokeExternalDb } from "@/lib/external-db";
import { useRBAC } from "@/hooks/useRBAC";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export function useQuotes() {
  const { user, isGestorCompras, isDev } = useAuth();
  const { isSupervisorOrAbove } = useRBAC();
  const { currentOrg } = useOrganization();
  const scope = useSalesScope();
  
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [techniques, setTechniques] = useState<PersonalizationTechnique[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgId = currentOrg?.id || null;

  const fetchQuotes = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await QuoteService.list({ userId: user.id, scope, orgId });
      setQuotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      toast.error("Erro ao carregar orçamentos");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuote = (quoteId: string) => QuoteService.getById(quoteId);

  const createQuote = async (quote: Partial<Quote>, items: QuoteItem[]) => {
    if (!user) return null;
    setIsLoading(true);
    try {
      const newQuote = await QuoteService.create({ quote, items, userId: user.id, orgId });
      if (!newQuote.id) {
        throw new Error("O orçamento criado não retornou um identificador.");
      }
      toast.success("Orçamento criado!");
      fetchQuotes();
      return newQuote;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao criar orçamento", { description: msg });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuote = async (quoteId: string, quote: Partial<Quote>, items: QuoteItem[]) => {
    if (!user) return null;
    setIsLoading(true);
    try {
      const updated = await QuoteService.update({ quoteId, quote, items, userId: user.id });
      toast.success("Orçamento atualizado!");
      fetchQuotes();
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao atualizar orçamento", { description: msg });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote["status"], notes?: string) => {
    if (!user) return false;
    
    const isSingularDecision = ['approved_singular', 'rejected_singular'].includes(status);
    const isManagerDecision = ['approved', 'rejected'].includes(status);

    if (isSingularDecision && !(isGestorCompras || isDev || isSupervisorOrAbove)) {
      toast.error("Apenas o comprador autorizado da Singular pode decidir esta solicitação.");
      return false;
    }
    if (isManagerDecision && !isSupervisorOrAbove) {
      toast.error("Apenas supervisores podem aprovar ou rejeitar orçamentos.");
      return false;
    }

    try {
      // rls-allow: consulta a versão e dados de notificação; a RPC valida o escopo
      // e aplica a transição sob lock, evitando a janela entre leitura e escrita.
      const { data: quote, error: fetchErr } = await supabase
        .from("quotes")
        .select("id, row_version, singular_id, quote_number, status")
        .eq("id", quoteId)
        .single();
      if (fetchErr) throw fetchErr;

      const { data: updatedRows, error } = await supabase.rpc("bulk_update_quote_status_atomic", {
        p_quote_ids: [quoteId],
        p_expected_row_versions: [quote.row_version],
        p_status: status,
        p_notes: notes ?? null,
      });
      
      ensureQuoteMutationApplied(
        updatedRows,
        error,
        1,
        "Concorrência detectada: Este orçamento foi modificado por outro usuário. Por favor, recarregue a página.",
      );

      // Logic for notifications
      if (status === 'pending_singular_approval') {
        const { data: buyers } = await supabase.from('profiles')
          .select('user_id')
          .eq('cooperativa_id', quote?.singular_id || '')
          .in('role', ['gestor_compras', 'comprador_singular']);
        
        if (buyers?.length) {
          const notifs = buyers.map(b => ({
            user_id: b.user_id,
            title: "Nova solicitação de PAC",
            message: `O PAC enviou o orçamento ${quote?.quote_number} para aprovação.`,
            type: 'info',
            category: 'approval',
            action_url: `/orcamentos/${quoteId}`
          }));
          await supabase.from('workspace_notifications').insert(notifs);
        }
      }

      toast.success("Status atualizado");
      fetchQuotes();
      return true;
    } catch (err) {
      toast.error("Erro ao atualizar status");
      return false;
    }
  };

  const bulkUpdateStatus = async (quoteIds: string[], status: Quote["status"], notes?: string) => {
    if (!user) return false;
    if (quoteIds.length === 0) return true;

    // Permission check
    const isRestrictedTransition = ['approved', 'rejected', 'approved_singular', 'rejected_singular'].includes(status);
    if (isRestrictedTransition && !isSupervisorOrAbove) {
      toast.error("Apenas supervisores podem aprovar ou rejeitar orçamentos em massa");
      return false;
    }

    setIsLoading(true);
    try {
      const uniqueQuoteIds = [...new Set(quoteIds)];
      const { data: accessibleQuotes, error: accessError } = await supabase
        .from("quotes")
        .select("id, row_version")
        .in("id", uniqueQuoteIds);
      if (accessError) throw accessError;
      ensureQuotesAreAccessible(accessibleQuotes, uniqueQuoteIds.length);

      const expectedVersions = uniqueQuoteIds.map((id) => {
        const quote = accessibleQuotes.find((candidate) => candidate.id === id);
        if (!quote) throw new Error("Um ou mais orçamentos não foram encontrados ou não estão no seu escopo.");
        return quote.row_version;
      });
      const { data: updatedRows, error } = await supabase.rpc("bulk_update_quote_status_atomic", {
        p_quote_ids: uniqueQuoteIds,
        p_expected_row_versions: expectedVersions,
        p_status: status,
        p_notes: notes ?? null,
      });

      ensureQuoteMutationApplied(
        updatedRows,
        error,
        uniqueQuoteIds.length,
        "Atualização concorrente detectada. Recarregue a lista antes de tentar novamente.",
      );

      toast.success(`${uniqueQuoteIds.length} orçamentos atualizados!`);
      fetchQuotes();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao atualizar orçamentos em massa", { description: msg });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuote = async (quoteId: string) => {
    try {
      await QuoteService.delete(quoteId);
      toast.success("Orçamento excluído");
      fetchQuotes();
      return true;
    } catch {
      toast.error("Erro ao excluir orçamento");
      return false;
    }
  };

  const reorderQuote = async (quoteId: string, itemIds?: string[]) => {
    if (!user) return null;
    setIsLoading(true);
    try {
      let newQuote;
      if (itemIds && itemIds.length > 0) {
        // Lógica de duplicação parcial
        const original = await QuoteService.getById(quoteId);
        if (!original) throw new Error("Orçamento não encontrado");
        
        const selectedItems = (original.items || []).filter(item => item.id && itemIds.includes(item.id));
        newQuote = await QuoteService.create({
          quote: { 
            client_id: original.client_id, 
            client_name: original.client_name,
            client_company: original.client_company,
            status: 'draft',
            notes: `Itens duplicados do orçamento #${original.quote_number}`
          },
          items: selectedItems,
          userId: user.id,
          orgId
        });
      } else {
        newQuote = await QuoteService.reorder(quoteId, user.id, orgId);
      }
      
      toast.success("Orçamento duplicado!", {
        description: `Novo orçamento #${newQuote.quote_number} criado como rascunho.`
      });
      fetchQuotes();
      return newQuote;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao reordenar orçamento", { description: msg });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reorderFromOrder = async (orderId: string) => {
    if (!user) return null;
    setIsLoading(true);
    try {
      const newQuote = await QuoteService.reorderFromOrder(orderId, user.id, orgId);
      toast.success("Pedido convertido em orçamento para recompra!", {
        description: `Novo orçamento #${newQuote.quote_number} criado como rascunho.`
      });
      fetchQuotes();
      return newQuote;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao converter pedido", { description: msg });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const syncQuoteToBitrix = async (quoteId: string) => {
    const log = createClientLogger('quote.syncBitrix', { base: { quoteId } });
    try {
      await invokeEdgeFunction("quote-sync", {
        body: { action: "sync_quote", data: { quoteId } },
        headers: log.headers(),
      });
      toast.success("Sincronizado com Bitrix!");
      fetchQuotes();
      return true;
    } catch (err) {
      toast.error("Erro ao sincronizar");
      return false;
    }
  };

  const fetchTechniques = async () => {
    try {
      const result = await invokeExternalDb<PersonalizationTechnique>({
        table: "personalization_techniques", operation: "select",
        filters: { is_active: true }, orderBy: { column: "name", ascending: true },
      });
      setTechniques(result.records || []);
    } catch (err) {
      // Silent fail as this is background info
    }
  };

  useRealtimeSync("quotes", {
    onDataChange: () => {
      console.info("Quotes table changed, refreshing...");
      fetchQuotes();
    }
  });

  useEffect(() => {
    if (user) {
      fetchQuotes();
      fetchTechniques();
    }
  }, [user]);

  return {
    quotes, techniques, isLoading, error,
    fetchQuotes, fetchQuote, createQuote, updateQuote, updateQuoteStatus, bulkUpdateStatus,
    deleteQuote, reorderQuote, reorderFromOrder, syncQuoteToBitrix,
    logQuoteHistory: (id: string, action: string, desc: string, opts?: Record<string, unknown>) =>
      QuoteService.logHistory({ quoteId: id, userId: user?.id || "", action, description: desc, ...opts })
  };
}
