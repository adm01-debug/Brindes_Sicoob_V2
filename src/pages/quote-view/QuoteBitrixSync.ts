/**
 * Lógica de sincronização com o Bitrix extraída da página de orçamento.
 */
import type { ProposalTemplateData } from '@/components/pdf/ProposalHtmlTemplate';
import type { Quote } from '@/hooks/quotes/useQuotes';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { updateQuoteStatusAtomically } from '@/services/quoteStatusTransition';
import { generateProposalPDFv2 } from '@/utils/proposalPdfReactGenerator';
import { bitrixCircuitBreaker } from '@/utils/resilience';
import { toast } from 'sonner';

interface SyncBitrixParams {
  quote: Quote;
  proposalData: ProposalTemplateData;
  logQuoteHistory: (
    quoteId: string,
    action: string,
    description: string,
    meta?: Record<string, unknown>,
  ) => Promise<void>;
}

interface BitrixResult {
  quote_id?: string | number | null;
  message?: string;
}

function requireQuoteId(quote: Quote) {
  if (quote.id) return quote.id;
  toast.error('Orçamento sem ID', {
    description: 'Não é possível sincronizar um orçamento ainda não salvo.',
  });
  return null;
}

async function uploadProposal(quote: Quote, quoteId: string, proposalData: ProposalTemplateData) {
  try {
    const blob = await generateProposalPDFv2(proposalData, {
      isDraft: quote.status === 'draft',
    });
    const filename = `proposta-${(quote.quote_number || quoteId).replace(/\s+/g, '')}.pdf`;
    const storagePath = `quotes/${quoteId}/${filename}`;
    const { error } = await supabase.storage.from('proposals').upload(storagePath, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (error) {
      logger.warn('PDF upload failed:', error);
      return undefined;
    }
    return storagePath;
  } catch (error) {
    logger.warn('PDF generation failed:', error);
    return undefined;
  }
}

async function invokeBitrix(
  quoteId: string,
  pdfPath: string | undefined,
  logQuoteHistory: SyncBitrixParams['logQuoteHistory'],
) {
  const { data, error } = await bitrixCircuitBreaker.execute(() =>
    supabase.functions.invoke('sync-quote-bitrix', {
      body: { quoteId, pdfPath },
    }),
  );
  if (!error && data?.success) return data.result as BitrixResult | undefined;
  const message = data?.error || error?.message || 'Erro desconhecido';
  await logQuoteHistory(quoteId, 'sync_error', `Falha: ${message}`);
  throw new Error(message);
}

function parseBitrixQuoteId(result: BitrixResult | undefined) {
  const parsed = result?.quote_id ? Number(result.quote_id) : Number.NaN;
  return parsed && !Number.isNaN(parsed) ? parsed : null;
}

async function markQuoteAsSent(quote: Quote, quoteId: string) {
  if (quote.status === 'sent') return;
  await updateQuoteStatusAtomically(quoteId, 'sent', 'Sincronização com Bitrix24 concluída');
}

async function logSuccessfulSync(
  quoteId: string,
  bitrixQuoteId: number | null,
  logQuoteHistory: SyncBitrixParams['logQuoteHistory'],
) {
  const suffix = bitrixQuoteId === null ? '' : ` — ID Bitrix: ${bitrixQuoteId}`;
  await logQuoteHistory(quoteId, 'sync_success', `Sincronizado com Bitrix24${suffix}`, {
    newValue: bitrixQuoteId === null ? undefined : String(bitrixQuoteId),
  });
}

function updatedQuote(bitrixQuoteId: number | null): Partial<Quote> {
  if (bitrixQuoteId === null) return { status: 'sent' };
  return { status: 'sent', bitrix_quote_id: String(bitrixQuoteId) };
}

export async function syncQuoteToBitrix({
  quote,
  proposalData,
  logQuoteHistory,
}: SyncBitrixParams): Promise<{ success: boolean; updatedQuote?: Partial<Quote> }> {
  const quoteId = requireQuoteId(quote);
  if (!quoteId) return { success: false };
  void logQuoteHistory(quoteId, 'sync_started', 'Sincronização com Bitrix24 iniciada').catch(
    () => undefined,
  );
  const pdfPath = await uploadProposal(quote, quoteId, proposalData);
  const result = await invokeBitrix(quoteId, pdfPath, logQuoteHistory);
  const bitrixQuoteId = parseBitrixQuoteId(result);
  await markQuoteAsSent(quote, quoteId);
  await logSuccessfulSync(quoteId, bitrixQuoteId, logQuoteHistory);
  toast.success(result?.message || 'Orçamento sincronizado com Bitrix24!');
  return { success: true, updatedQuote: updatedQuote(bitrixQuoteId) };
}
