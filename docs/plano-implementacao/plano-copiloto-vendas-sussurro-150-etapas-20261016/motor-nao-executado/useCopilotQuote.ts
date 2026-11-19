/**
 * useCopilotQuote — Hook React para orçamentos guiados pelo Copilot (F08, E071-E075)
 *
 * Detecta quando o estado COOPERA tem E (Escopo) preenchido e habilita
 * a geração de orçamento pré-preenchido com contexto da conversa.
 */

import { useState, useCallback, useMemo } from "react";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface CooperaField {
  status: "pendente" | "parcial" | "completo";
  value: string | null;
}

export interface CooperaState {
  C?: CooperaField;
  O_orcamento?: CooperaField;
  O_ocasiao?: CooperaField;
  P?: CooperaField;
  E?: CooperaField;
  R?: CooperaField;
  A?: CooperaField;
}

export interface QuoteContext {
  product_suggestion: string | null;
  quantity: string | null;
  budget_range: string | null;
  event_date: string | null;
  client_name: string | null;
  scope_complete: boolean;
}

export interface SuggestedProduct {
  name: string;
  quantity: string | null;
}

export interface UseCopilotQuoteReturn {
  /** Se o escopo (E) está preenchido e o orçamento pode ser gerado */
  canGenerateQuote: boolean;
  /** Produtos identificados no campo E do COOPERA */
  suggestedProducts: SuggestedProduct[];
  /** Busca o contexto da conversa e retorna o QuoteContext pré-preenchido */
  generateQuote: () => Promise<QuoteContext | null>;
  /** Estado de carregamento */
  isLoading: boolean;
}

function parseProductsFromScope(scopeValue: string | null): SuggestedProduct[] {
  if (!scopeValue) return [];
  const segments = scopeValue
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.map((segment) => {
    const qtyMatch = segment.match(/\b(\d[\d.,]*)\s*(un|pç|peça|peças|unidades?|kit|kits)?\b/i);
    const name = segment
      .replace(/^\d[\d.,]*\s*(un|pç|peça|peças|unidades?|kit|kits)?\s*/i, "")
      .trim();
    return { name: name || segment, quantity: qtyMatch ? qtyMatch[1] : null };
  });
}

/**
 * @param conversationId - ID da conversa em copilot_conversations
 * @param cooperaState  - Estado COOPERA atual da conversa (passado pelo componente pai)
 */
export function useCopilotQuote(
  conversationId: string | null,
  cooperaState: CooperaState | null,
): UseCopilotQuoteReturn {
  const [isLoading, setIsLoading] = useState(false);

  const scopeField = cooperaState?.E ?? null;

  const canGenerateQuote = useMemo(() => {
    if (!conversationId || !scopeField) return false;
    return scopeField.status === "completo" || scopeField.status === "parcial";
  }, [conversationId, scopeField]);

  const suggestedProducts = useMemo(() => {
    return parseProductsFromScope(scopeField?.value ?? null);
  }, [scopeField]);

  const generateQuote = useCallback(async (): Promise<QuoteContext | null> => {
    if (!conversationId) {
      toast.error("Nenhuma conversa selecionada para gerar orçamento.");
      return null;
    }
    if (!canGenerateQuote) {
      toast.warning(
        "Preencha ao menos parcialmente o escopo (campo E do COOPERA) antes de gerar o orçamento.",
      );
      return null;
    }
    setIsLoading(true);
    try {
      const result = await invokeEdgeFunction<{ quote_context: QuoteContext }>(
        "copilot-quote-context",
        { body: { conversation_id: conversationId } },
      );
      if (!result?.quote_context) {
        toast.error("Não foi possível obter o contexto de orçamento.");
        return null;
      }
      return result.quote_context;
    } catch (err) {
      console.error("[useCopilotQuote] generateQuote falhou:", err);
      toast.error("Erro ao gerar contexto de orçamento. Tente novamente.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, canGenerateQuote]);

  return { canGenerateQuote, suggestedProducts, generateQuote, isLoading };
}
