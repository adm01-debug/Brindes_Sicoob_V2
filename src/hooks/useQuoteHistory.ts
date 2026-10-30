import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface QuoteHistoryEntry {
  id: string;
  quote_id: string;
  user_id: string;
  action: string;
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  description: string;
  metadata?: Record<string, Json>;
  created_at: string;
}

function valueOr<T>(value: T | null | undefined | false | "", fallback: T): T {
  return value ? value as T : fallback;
}

interface HistoryOptions {
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, Json>;
}

function historyRpcParams(
  quoteId: string,
  action: string,
  description: string,
  options?: HistoryOptions,
) {
  const details = valueOr(options, {});
  return {
    p_quote_id: quoteId,
    p_action: action,
    p_description: description,
    p_field_changed: valueOr(details.fieldChanged, undefined),
    p_old_value: valueOr(details.oldValue, undefined),
    p_new_value: valueOr(details.newValue, undefined),
    p_metadata: {
      ...valueOr(details.metadata, {}),
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
    },
  };
}

export function useQuoteHistory() {
  const [history, setHistory] = useState<QuoteHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async (quoteId: string): Promise<QuoteHistoryEntry[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quote_history")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      const entries = (data as unknown[] || []) as QuoteHistoryEntry[];
      setHistory(entries);
      return entries;
    } catch (err) {
      console.error("Error fetching history:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const addHistoryEntry = async (
    quoteId: string,
    action: string,
    description: string,
    options?: HistoryOptions
  ): Promise<boolean> => {
    // Audit logs are special: we want to capture UA/IP automatically via RPC if possible
    // or manually here if the RPC doesn't handle all metadata.
    
    try {
      const { error } = await supabase.rpc(
        "append_quote_history_note",
        historyRpcParams(quoteId, action, description, options),
      );

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error adding history entry:", err);
      return false;
    }
  };

  const logQuoteCreated = async (quoteId: string, quoteNumber: string) =>
    addHistoryEntry(quoteId, "created", `Orçamento ${quoteNumber} criado`);

  const logQuoteUpdated = async (quoteId: string, changes: string[]) => {
    const description = changes.length > 0
      ? `Orçamento atualizado: ${changes.join(", ")}`
      : "Orçamento atualizado";
    return addHistoryEntry(quoteId, "updated", description, { metadata: { changes } });
  };

  const logStatusChanged = async (quoteId: string, oldStatus: string, newStatus: string) => {
    const statusLabels: Record<string, string> = {
      draft: "Rascunho", pending: "Pendente", sent: "Enviado",
      approved: "Aprovado", rejected: "Rejeitado", expired: "Expirado",
    };
    return addHistoryEntry(quoteId, "status_changed",
      `Status alterado de "${statusLabels[oldStatus] || oldStatus}" para "${statusLabels[newStatus] || newStatus}"`,
      { fieldChanged: "status", oldValue: oldStatus, newValue: newStatus }
    );
  };

  const logItemAdded = async (quoteId: string, productName: string, quantity: number) =>
    addHistoryEntry(quoteId, "item_added", `Item adicionado: ${productName} (${quantity}x)`, { metadata: { productName, quantity } });

  const logItemRemoved = async (quoteId: string, productName: string) =>
    addHistoryEntry(quoteId, "item_removed", `Item removido: ${productName}`);

  const logItemUpdated = async (quoteId: string, productName: string, change: string) =>
    addHistoryEntry(quoteId, "item_updated", `Item "${productName}" atualizado: ${change}`);

  const logDuplicated = async (quoteId: string, originalQuoteNumber: string) =>
    addHistoryEntry(quoteId, "created", `Orçamento duplicado a partir de ${originalQuoteNumber}`);

  const logPdfGenerated = async (quoteId: string, options: Record<string, Json>) =>
    addHistoryEntry(quoteId, "pdf_generated", "Nova versão do PDF gerada", { metadata: { pdf_options: options } });

  return {
    history,
    isLoading,
    fetchHistory,
    addHistoryEntry,
    logQuoteCreated,
    logQuoteUpdated,
    logStatusChanged,
    logItemAdded,
    logItemRemoved,
    logItemUpdated,
    logDuplicated,
    logPdfGenerated,
  };
}
