import { supabase } from "@/integrations/supabase/client";
import type { Quote } from "@/hooks/quotes/quoteTypes";

type QuoteStatusTransition = {
  id: string;
  row_version: number;
  status: string;
};

type BulkStatusArgs = {
  p_quote_ids: string[];
  p_expected_row_versions: number[];
  p_status: string;
  p_notes?: string;
};

type ApproveWithPdfArgs = {
  p_quote_id: string;
  p_expected_quote_row_version: number;
  p_approved_pdf_url: string;
  p_notes?: string;
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
    // rls-allow: lookup pré-RPC por UUID; a RLS filtra o escopo e a RPC revalida sob lock.
    .from("quotes")
    .select("id, row_version")
    .eq("id", quoteId)
    .single();
  if (quoteError) throw quoteError;

  const rpcArgs = {
    p_quote_ids: [quoteId],
    p_expected_row_versions: [quote.row_version],
    p_status: status,
    p_notes: notes ?? null,
  };
  // A função SQL aceita NULL, embora o tipo gerado represente o parâmetro opcional como string.
  const { data, error } = await supabase.rpc(
    "bulk_update_quote_status_atomic",
    rpcArgs as BulkStatusArgs,
  );
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

export async function approveQuoteWithPdfAtomically(
  quoteId: string,
  approvedPdfUrl: string,
  notes?: string,
): Promise<QuoteStatusTransition & { approved_pdf_url: string }> {
  const { data: quote, error: quoteError } = await supabase
    // rls-allow: lookup pré-RPC por UUID; a RLS filtra o escopo e a RPC revalida sob lock.
    .from("quotes")
    .select("id, row_version")
    .eq("id", quoteId)
    .single();
  if (quoteError) throw quoteError;

  const rpcArgs = {
    p_quote_id: quoteId,
    p_expected_quote_row_version: quote.row_version,
    p_approved_pdf_url: approvedPdfUrl,
    p_notes: notes ?? null,
  };
  // A função SQL aceita NULL, embora o tipo gerado represente o parâmetro opcional como string.
  const { data, error } = await supabase.rpc(
    "approve_quote_with_pdf_atomic",
    rpcArgs as ApproveWithPdfArgs,
  );
  if (error) throw error;
  const approved = data?.[0];
  if (!approved) {
    throw new Error("A aprovação com PDF não foi confirmada pelo banco.");
  }
  return approved;
}
