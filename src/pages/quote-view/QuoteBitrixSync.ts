/**
 * Bitrix sync logic extracted from QuoteViewPage
 */
import { supabase } from "@/integrations/supabase/client";
import { generateProposalPDFv2 } from "@/utils/proposalPdfReactGenerator";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { ProposalTemplateData } from "@/components/pdf/ProposalHtmlTemplate";
import type { Quote } from "@/hooks/quotes/useQuotes";
import { bitrixCircuitBreaker } from "@/utils/resilience";

interface SyncBitrixParams {
  quote: Quote;
  proposalData: ProposalTemplateData;
  logQuoteHistory: (quoteId: string, action: string, description: string, meta?: Record<string, unknown>) => Promise<void>;
}

export async function syncQuoteToBitrix({
  quote,
  proposalData,
  logQuoteHistory,
}: SyncBitrixParams): Promise<{
  success: boolean;
  updatedQuote?: Partial<Quote>;
}> {
  if (!quote.id) {
    toast.error("Orçamento sem ID", {
      description: "Não é possível sincronizar um orçamento ainda não salvo.",
    });
    return { success: false };
  }
  const quoteId = quote.id;

  logQuoteHistory(quoteId, "sync_started", "Sincronização com Bitrix24 iniciada").catch(() => {});

  // Generate PDF and upload
  let pdfStorageUrl: string | undefined;
  let filename: string | undefined;
  try {
    const blob = await generateProposalPDFv2(proposalData, { isDraft: quote.status === "draft" });
    filename = `proposta-${(quote.quote_number || quoteId).replace(/\s+/g, "")}.pdf`;
    const storagePath = `quotes/${quoteId}/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("proposals")
    .upload(storagePath, blob, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      logger.warn("PDF upload failed:", uploadError);
    } else pdfStorageUrl = storagePath;
  } catch (pdfErr) {
    logger.warn("PDF generation failed:", pdfErr);
  }

  const { data, error } = await bitrixCircuitBreaker.execute(() => 
    supabase.functions.invoke("sync-quote-bitrix", {
      body: {
        quoteId, pdfPath: pdfStorageUrl,
      },
    })
  );

  if (error || !data?.success) {
    const msg = data?.error || error?.message || "Erro desconhecido";
    await logQuoteHistory(quoteId, "sync_error", `Falha: ${msg}`);
    throw new Error(msg);
  }

  const result = data.result;
  const parsedBitrixId = result?.quote_id ? Number(result.quote_id) : null;
  const bitrixQuoteIdFromResponse = parsedBitrixId && !isNaN(parsedBitrixId) ? parsedBitrixId : null;

  const crmUpdates: Record<string, unknown> = { status: "sent" };
  if (bitrixQuoteIdFromResponse) crmUpdates.bitrix_quote_id = String(bitrixQuoteIdFromResponse);

  try {
    // rls-allow: update por id; RLS valida ownership
    await supabase.from("quotes").update(crmUpdates).eq("id", quoteId);
  } catch { /* ignore */ }

  await logQuoteHistory(quoteId, "sync_success",
    `Sincronizado com Bitrix24${bitrixQuoteIdFromResponse ? ` — ID Bitrix: ${bitrixQuoteIdFromResponse}` : ""}`,
    { newValue: bitrixQuoteIdFromResponse ? String(bitrixQuoteIdFromResponse) : undefined }
  );

  toast.success(result?.message || "Orçamento sincronizado com Bitrix24!");

  return {
    success: true,
    updatedQuote: {
      status: "sent",
      ...(bitrixQuoteIdFromResponse ? { bitrix_quote_id: String(bitrixQuoteIdFromResponse) } : {}),
    },
  };
}
