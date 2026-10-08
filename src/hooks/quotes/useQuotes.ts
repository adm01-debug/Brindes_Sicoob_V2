/**
 * useQuotes — Hook de orçamentos (refatorado)
 */
import { useCallback, useState, useEffect } from "react";
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

const quotesLogger = createClientLogger("quotes.realtime");
const SINGULAR_DECISIONS: Quote["status"][] = ["approved_singular", "rejected_singular"];
const MANAGER_DECISIONS: Quote["status"][] = ["approved", "rejected"];

function statusPermissionError(
  status: Quote["status"],
  canDecideSingular: boolean,
  isSupervisorOrAbove: boolean,
) {
  if (SINGULAR_DECISIONS.includes(status) && !canDecideSingular) {
    return "Apenas o comprador autorizado da Singular pode decidir esta solicitação.";
  }
  if (MANAGER_DECISIONS.includes(status) && !isSupervisorOrAbove) {
    return "Apenas supervisores podem aprovar ou rejeitar orçamentos.";
  }
  return null;
}

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

  const fetchQuotes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await QuoteService.list({ userId: user.id, scope, orgId });
      setQuotes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      toast.error("Erro ao carregar orçamentos");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, scope, user]);

  const fetchQuote = useCallback((quoteId: string) => QuoteService.getById(quoteId), []);

  const createQuote = async (quote: Partial<Quote>, items: QuoteItem[], idempotencyKey: string) => {
    if (!user) return null;
    setIsLoading(true);
    try {
      const newQuote = await QuoteService.create({ quote, items, userId: user.id, orgId, idempotencyKey });
      if (!newQuote.id) {
        throw new Error("O orçamento criado não retornou um identificador.");
      }
      toast.success("Orçamento criado!");
      fetchQuotes();
      return newQuote;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao criar orçamento", { description: msg });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuote = async (quoteId: string, quote: Partial<Quote>, items: QuoteItem[], expectedRowVersion: number) => {
    if (!user) return null;
    setIsLoading(true);
    try {
      const updated = await QuoteService.update({ quoteId, quote, items, userId: user.id, expectedRowVersion });
      toast.success("Orçamento atualizado!");
      fetchQuotes();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao atualizar orçamento", { description: msg });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote["status"], notes?: string) => {
    if (!user) return false;
    
    const permissionError = statusPermissionError(
      status,
      isGestorCompras || isDev || isSupervisorOrAbove,
      isSupervisorOrAbove,
    );
    if (permissionError) {
      toast.error(permissionError);
      return false;
    }

    try {
      // rls-allow: consulta a versão e dados de notificação; a RPC valida o escopo
      // e aplica a transição sob lock, evitando a janela entre leitura e escrita.
      const { data: quote, error: fetchErr } = await supabase
        // rls-allow: lookup pré-RPC por UUID; a RLS valida o escopo e a RPC revalida sob lock.
        .from("quotes")
        .select("id, row_version")
        .eq("id", quoteId)
        .single();
      if (fetchErr) throw fetchErr;

      const { data: updatedRows, error } = await supabase.rpc("bulk_update_quote_status_atomic", {
        p_quote_ids: [quoteId],
        p_expected_row_versions: [quote.row_version],
        p_status: status,
        p_notes: notes ?? undefined,
      });
      
      ensureQuoteMutationApplied(
        updatedRows,
        error,
        1,
        "Concorrência detectada: Este orçamento foi modificado por outro usuário. Por favor, recarregue a página.",
      );

      toast.success("Status atualizado");
      fetchQuotes();
      return true;
    } catch {
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
        // rls-allow: lookup pré-RPC por UUIDs; a RLS filtra o escopo e a RPC revalida sob lock.
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
        p_notes: notes ?? undefined,
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
        throw new Error("A recompra parcial exige uma nova seleção no catálogo para não reutilizar preço ou estoque antigos.");
      } else {
        newQuote = await QuoteService.reorder(quoteId, user.id, orgId);
      }
      
      toast.success("Orçamento de recompra criado", {
        description: `Preço, mínimo e estoque foram reconsultados para o orçamento #${newQuote.quote_number}.`
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
    } catch {
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
    } catch {
      // Silent fail as this is background info
    }
  };

  useRealtimeSync("quotes", {
    onDataChange: () => {
      quotesLogger.info("table_changed");
      fetchQuotes();
    }
  });

  useEffect(() => {
    if (user) {
      fetchQuotes();
      fetchTechniques();
    }
  }, [fetchQuotes, user]);

  return {
    quotes, techniques, isLoading, error,
    fetchQuotes, fetchQuote, createQuote, updateQuote, updateQuoteStatus, bulkUpdateStatus,
    deleteQuote, reorderQuote, reorderFromOrder, syncQuoteToBitrix,
    logQuoteHistory: (id: string, action: string, desc: string, opts?: Record<string, unknown>) =>
      QuoteService.logHistory({ quoteId: id, userId: user?.id || "", action, description: desc, ...opts })
  };
}
