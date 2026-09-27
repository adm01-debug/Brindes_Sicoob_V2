import { supabase } from "@/integrations/supabase/client";
import type { Quote } from "@/hooks/quotes/quoteTypes";

type QuoteStatusTransition = {
  id: string;
  row_version: number;
  status: string;
};

/**
 * Executa uma transição individual pela mesma RPC usada em operações em lote.
 * A leitura da versão ocorre imediatamente antes da chamada; o banco continua
 * sendo a autoridade para escopo, transição e concorrência.
 */
export async function updateQuoteStatusAtomically(
  quoteId: string,
  status: Quote["status"],
  notes?: string,
): Promise<QuoteStatusTransition> {
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, row_version")
    .eq("id", quoteId)
    .single();
  if (quoteError) throw quoteError;

  const { data, error } = await supabase.rpc("bulk_update_quote_status_atomic", {
    p_quote_ids: [quoteId],
    p_expected_row_versions: [quote.row_version],
    p_status: status,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  if (!data || data.length !== 1) {
    throw new Error("A transição do orçamento não foi confirmada pelo banco.");
  }
  const transition = data[0];
  if (!transition) {
    throw new Error("A transição do orçamento não retornou uma linha confirmada.");
  }
  return transition;
}
