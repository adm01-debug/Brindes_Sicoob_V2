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
import type { Quote, QuoteItem, PersonalizationTechnique } from "./quotes/quoteTypes";
import { STATUS_LABELS } from "./quotes/quoteHelpers";
import { invokeExternalDb } from "@/lib/external-db";
import { useRBAC } from "@/hooks/useRBAC";

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
    } catch (err: any) {
      setError(err.message);
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
      await QuoteService.logHistory({
        quoteId: newQuote.id,
        userId: user.id,
        action: "created",
        description: `Orçamento ${newQuote.quote_number} criado`
      });
      toast.success("Orçamento criado!");
      fetchQuotes();
      return newQuote;
    } catch (err: any) {
      toast.error("Erro ao criar orçamento", { description: err.message });
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
    } catch (err: any) {
      toast.error("Erro ao atualizar orçamento");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote["status"], notes?: string) => {
    if (!user) return false;
    
    // Permission check for status transitions
    const isRestrictedTransition = ['approved', 'rejected', 'approved_singular', 'rejected_singular'].includes(status);
    
    // Check for "approved" specifically to set approved_by/at correctly
    const isApprovalDecision = ['approved', 'approved_singular'].includes(status);
    
    // Check if transition is to one of the final/manager states
    if (isRestrictedTransition && !isSupervisorOrAbove) {
      toast.error("Apenas supervisores podem aprovar ou rejeitar orçamentos");
      return false;
    }

    try {
      const { data: quote, error: fetchErr } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
      if (fetchErr) throw fetchErr;
      const oldStatus = quote?.status || "draft";
      
      const updateData: any = { status };
      if (notes) updateData.rejection_notes = notes;
      if (isApprovalDecision) {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user.id;
      }

      const { error } = await supabase.from("quotes").update(updateData).eq("id", quoteId);
      if (error) throw error;

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

      await QuoteService.logHistory({
        quoteId,
        userId: user.id,
        action: "status_changed",
        description: `Status alterado de "${STATUS_LABELS[oldStatus]}" para "${STATUS_LABELS[status]}"`,
        fieldChanged: "status",
        oldValue: oldStatus,
        newValue: status,
        metadata: { notes }
      });

      toast.success("Status atualizado");
      fetchQuotes();
      return true;
    } catch (err) {
      toast.error("Erro ao atualizar status");
      return false;
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
    } catch (err: any) {
      toast.error("Erro ao reordenar orçamento");
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
    } catch (err: any) {
      toast.error("Erro ao converter pedido");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const syncQuoteToBitrix = async (quoteId: string) => {
    const log = createClientLogger('quote.syncBitrix', { base: { quoteId } });
    try {
      const { data, error: fnError } = await supabase.functions.invoke("quote-sync", {
        body: { action: "sync_quote", data: { quoteId } },
        headers: log.headers(),
      });
      if (fnError) throw fnError;
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
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQuotes();
      fetchTechniques();
    }
  }, [user]);

  return {
    quotes, techniques, isLoading, error,
    fetchQuotes, fetchQuote, createQuote, updateQuote, updateQuoteStatus,
    deleteQuote, reorderQuote, reorderFromOrder, syncQuoteToBitrix,
    logQuoteHistory: (id: string, action: string, desc: string, opts: any) => 
      QuoteService.logHistory({ quoteId: id, userId: user?.id || "", action, description: desc, ...opts })
  };
}
