/**
 * Hook to manage QuoteViewPage state and data fetching.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuotes, type Quote } from '@/hooks/quotes/useQuotes';
import { useAuth } from '@/contexts/AuthContext';
import { useQuoteApproval } from '@/hooks/useQuoteApproval';
import { selectCrmById } from '@/lib/crm-db';
import { toast } from 'sonner';
import { generateProposalPDFv2, downloadPDF } from '@/utils/proposalPdfReactGenerator';
import { type ProposalTemplateData } from '@/components/pdf/ProposalHtmlTemplate';
import {
  formatCurrency as formatCurrencyHelper,
  calcPersTotal,
  formatCNPJ,
} from './QuoteActionHandlers';
import type { CrmCompany } from '@/types/crm';

type QuoteItem = NonNullable<Quote['items']>[number];

function calculateQuoteTotals(quote: Quote) {
  const items = quote.items || [];
  const productSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const personalizationSubtotal = items.reduce(
    (sum, item) =>
      sum +
      (item.personalizations || []).reduce(
        (itemSum: number, personalization: { total_cost?: number }) =>
          itemSum + calcPersTotal(personalization.total_cost || 0, item.quantity),
        0,
      ),
    0,
  );
  const subtotal = productSubtotal + personalizationSubtotal;
  const discount = quote.discount_percent
    ? Math.round(subtotal * (quote.discount_percent / 100) * 100) / 100
    : quote.discount_amount || 0;
  const shipping = ['fob', 'fob_pre'].includes(quote.shipping_type || '')
    ? quote.shipping_cost || 0
    : 0;
  return { subtotal, discount, total: subtotal - discount + shipping };
}

function getComposedProductCode(item: QuoteItem) {
  if (!item.product_sku) return undefined;
  return item.color_name ? `${item.product_sku}-${item.color_name}` : item.product_sku;
}

function buildProposalItem(item: QuoteItem): ProposalTemplateData['items'][number] {
  return {
    name: item.product_name,
    sku: item.product_sku || undefined,
    composedCode: getComposedProductCode(item),
    colorHex: item.color_hex || undefined,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    color: item.color_name || undefined,
    imageUrl: item.product_image_url || undefined,
    kit_group_id: item.kit_group_id || null,
    kit_name: item.kit_name || null,
    personalizations: (item.personalizations || []).map((personalization) => ({
      technique_name: personalization.technique_name || 'Personalizacao',
      colors_count: personalization.colors_count || 1,
      width_cm: personalization.width_cm || undefined,
      height_cm: personalization.height_cm || undefined,
      area_cm2: personalization.area_cm2 || undefined,
      unit_cost: personalization.unit_cost || 0,
      setup_cost: personalization.setup_cost || 0,
      total_cost: personalization.total_cost || 0,
      notes: personalization.notes || undefined,
    })),
  };
}

function formatProposalDate(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return format(new Date(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function asOptional<T>(value: T | null | undefined) {
  return value || undefined;
}

function getProposalClientName(quote: Quote) {
  return quote.client_company || quote.client_name || 'Não especificado';
}

function buildProposalData(
  quote: Quote,
  clientCnpj: string | undefined,
  seller: { name: string; email?: string },
): ProposalTemplateData {
  const totals = calculateQuoteTotals(quote);
  return {
    quoteNumber: String(asOptional(quote.quote_number) ?? '').replace(/\s+/g, ''),
    date: formatProposalDate(quote.created_at, ''),
    validUntil: formatProposalDate(quote.valid_until, '30 dias'),
    client: {
      name: getProposalClientName(quote),
      phone: asOptional(quote.client_phone),
      company: asOptional(quote.client_company),
      contactName: asOptional(quote.client_name),
      cnpj: clientCnpj,
    },
    seller,
    items: (quote.items ?? []).map(buildProposalItem),
    subtotal: totals.subtotal,
    discount: asOptional(totals.discount),
    shippingCost: asOptional(quote.shipping_cost),
    shippingType: asOptional(quote.shipping_type),
    total: totals.total,
    notes: asOptional(quote.notes),
    paymentTerms: asOptional(quote.payment_terms),
    deliveryTime: asOptional(quote.delivery_time),
  };
}

function buildWhatsAppMessage(quote: Quote | null, approvalLink: string | null) {
  const lines = [
    `📋 *Proposta Comercial ${quote?.quote_number || ''}*`,
    '',
    `💰 Valor Total: *${formatCurrencyHelper(quote?.total || 0)}*`,
  ];
  if (quote?.valid_until) {
    lines.push(
      `📅 Válida até: ${format(new Date(quote.valid_until), 'dd/MM/yyyy', { locale: ptBR })}`,
    );
  }
  if (approvalLink) lines.push('', `✅ Aprovar proposta: ${approvalLink}`);
  lines.push('', 'Qualquer dúvida, estou à disposição! 😊');
  return encodeURIComponent(lines.join('\n'));
}

function getWhatsAppUrl(phone: string | undefined, message: string) {
  const digits = phone?.replace(/\D/g, '') || '';
  return digits ? `https://wa.me/55${digits}?text=${message}` : `https://wa.me/?text=${message}`;
}

type QuoteFetcher = ReturnType<typeof useQuotes>['fetchQuote'];
type HistoryLogger = ReturnType<typeof useQuotes>['logQuoteHistory'];

function useLoadedQuote(id: string | undefined, fetchQuote: QuoteFetcher) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [clientCnpj, setClientCnpj] = useState<string | undefined>(undefined);
  const [bitrixCompanyId, setBitrixCompanyId] = useState<string | null>(null);
  const loadQuote = useCallback(async () => {
    if (!id) return;
    setIsLoadingQuote(true);
    const data = await fetchQuote(id);
    setQuote(data);
    setIsLoadingQuote(false);
    if (!data?.client_id) return;
    try {
      const company = await selectCrmById<Pick<CrmCompany, 'cnpj' | 'bitrix_company_id'>>(
        'companies',
        data.client_id,
      );
      if (company?.cnpj) setClientCnpj(formatCNPJ(company.cnpj));
      if (company?.bitrix_company_id) setBitrixCompanyId(String(company.bitrix_company_id));
    } catch {
      // Empresa não encontrada no CRM.
    }
  }, [fetchQuote, id]);
  useEffect(() => {
    if (id) void loadQuote();
  }, [id, loadQuote]);
  return { quote, setQuote, isLoadingQuote, clientCnpj, bitrixCompanyId };
}

function useProposalData(quote: Quote | null, clientCnpj: string | undefined) {
  const { user, profile } = useAuth();
  return useMemo(() => {
    if (!quote) return null;
    return buildProposalData(quote, clientCnpj, {
      name: profile?.full_name || user?.email || 'Vendedor',
      email: user?.email || undefined,
    });
  }, [quote, user, profile, clientCnpj]);
}

function usePdfDownload(quote: Quote | null, proposalData: ProposalTemplateData | null) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const handleDownloadPDF = async () => {
    if (!proposalData) return;
    setIsGeneratingPDF(true);
    try {
      const blob = await generateProposalPDFv2(proposalData, {
        isDraft: quote?.status === 'draft',
      });
      const number = (quote?.quote_number || 'sem-numero').replace(/\s+/g, '');
      downloadPDF(blob, `proposta-${number}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  return { isGeneratingPDF, handleDownloadPDF };
}

interface ApprovalShareInput {
  id?: string;
  quote: Quote | null;
  generateApprovalLink: ReturnType<typeof useQuoteApproval>['generateApprovalLink'];
  copyToClipboard: ReturnType<typeof useQuoteApproval>['copyToClipboard'];
}

function useApprovalShare(input: ApprovalShareInput) {
  const [approvalLink, setApprovalLink] = useState<string | null>(null);
  const handleGenerateApprovalLink = async () => {
    if (!input.id) return;
    const result = await input.generateApprovalLink(input.id);
    if (result) setApprovalLink(result.link);
  };
  const handleWhatsAppShare = () => {
    const message = buildWhatsAppMessage(input.quote, approvalLink);
    window.open(getWhatsAppUrl(input.quote?.client_phone, message), '_blank');
    toast.success('WhatsApp aberto!');
  };
  const handleShareLink = async () => {
    if (approvalLink) return input.copyToClipboard(approvalLink);
    if (!input.id) return;
    const result = await input.generateApprovalLink(input.id);
    if (!result) return;
    setApprovalLink(result.link);
    await input.copyToClipboard(result.link);
  };
  return { approvalLink, handleGenerateApprovalLink, handleWhatsAppShare, handleShareLink };
}

interface BitrixSyncInput {
  quote: Quote | null;
  proposalData: ProposalTemplateData | null;
  setQuote: Dispatch<SetStateAction<Quote | null>>;
  logQuoteHistory: HistoryLogger;
}

function useBitrixSync(input: BitrixSyncInput) {
  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncBitrix = async () => {
    if (!input.quote || !input.proposalData) return;
    setIsSyncing(true);
    try {
      const { syncQuoteToBitrix } = await import('./QuoteBitrixSync');
      const result = await syncQuoteToBitrix({
        quote: input.quote,
        proposalData: input.proposalData,
        logQuoteHistory: input.logQuoteHistory,
      });
      if (result.success && result.updatedQuote) {
        input.setQuote((current) => (current ? { ...current, ...result.updatedQuote } : current));
      }
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'erro desconhecido';
      toast.error('Erro ao sincronizar', { description });
    } finally {
      setIsSyncing(false);
    }
  };
  return { isSyncing, handleSyncBitrix };
}

export function useQuoteViewData(id: string | undefined) {
  const { fetchQuote, logQuoteHistory, reorderQuote } = useQuotes();
  const approval = useQuoteApproval();
  const loaded = useLoadedQuote(id, fetchQuote);
  const proposalData = useProposalData(loaded.quote, loaded.clientCnpj);
  const pdf = usePdfDownload(loaded.quote, proposalData);
  const sharing = useApprovalShare({
    id,
    quote: loaded.quote,
    generateApprovalLink: approval.generateApprovalLink,
    copyToClipboard: approval.copyToClipboard,
  });
  const bitrix = useBitrixSync({
    quote: loaded.quote,
    proposalData,
    setQuote: loaded.setQuote,
    logQuoteHistory,
  });
  const [showPresentation, setShowPresentation] = useState(false);
  return {
    ...loaded,
    ...pdf,
    ...sharing,
    ...bitrix,
    showPresentation,
    setShowPresentation,
    proposalData,
    isGenerating: approval.isGenerating,
    fetchQuote,
    logQuoteHistory,
    reorderQuote,
  };
}
