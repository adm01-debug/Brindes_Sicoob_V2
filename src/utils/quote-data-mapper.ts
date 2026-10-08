import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type Quote } from '@/hooks/quotes/quoteTypes';
import { type ProposalTemplateData } from '@/components/pdf/ProposalHtmlTemplate';

type ProposalItem = ProposalTemplateData["items"][number];
type QuoteItem = NonNullable<Quote["items"]>[number];
type QuotePersonalization = NonNullable<QuoteItem["personalizations"]>[number];

function valueOr<T>(value: T | null | undefined | false | "" | 0, fallback: T): T {
  return value ? value as T : fallback;
}

function formatProposalDate(value: string | null | undefined, fallback: string): string {
  return value
    ? format(new Date(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : fallback;
}

function mapPersonalization(
  personalization: QuotePersonalization,
): NonNullable<ProposalItem["personalizations"]>[number] {
  return {
    technique_name: valueOr(personalization.technique_name, 'Personalização'),
    colors_count: valueOr(personalization.colors_count, 1),
    width_cm: valueOr(personalization.width_cm, undefined),
    height_cm: valueOr(personalization.height_cm, undefined),
    area_cm2: valueOr(personalization.area_cm2, undefined),
    unit_cost: valueOr(personalization.unit_cost, 0),
    setup_cost: valueOr(personalization.setup_cost, 0),
    total_cost: valueOr(personalization.total_cost, 0),
    notes: valueOr(personalization.notes, undefined),
  };
}

function composedProductCode(item: QuoteItem): string | undefined {
  if (!item.product_sku) return undefined;
  return item.color_name ? `${item.product_sku}-${item.color_name}` : item.product_sku;
}

function mapProposalItem(item: QuoteItem): ProposalItem {
  return {
    name: item.product_name,
    sku: valueOr(item.product_sku, undefined),
    composedCode: composedProductCode(item),
    colorHex: valueOr(item.color_hex, undefined),
    quantity: item.quantity,
    unitPrice: item.unit_price,
    color: valueOr(item.color_name, undefined),
    imageUrl: valueOr(item.product_image_url, undefined),
    personalizations: valueOr(item.personalizations, []).map(mapPersonalization),
    kit_group_id: valueOr(item.kit_group_id, null),
    kit_name: valueOr(item.kit_name, null),
  };
}

function quoteDiscount(quote: Quote, subtotal: number): number {
  if (quote.discount_percent) {
    return Math.round(subtotal * (quote.discount_percent / 100) * 100) / 100;
  }
  return valueOr(quote.discount_amount, 0);
}

function quoteShipping(quote: Quote): number {
  const includesShipping = quote.shipping_type === 'fob' || quote.shipping_type === 'fob_pre';
  return includesShipping ? valueOr(quote.shipping_cost, 0) : 0;
}

/**
 * Mapeia um objeto Quote para o formato ProposalTemplateData usado nos templates de PDF e aprovação.
 */
export function mapQuoteToProposalData(
  quote: Quote, 
  clientCnpj?: string, 
  sellerInfo?: { name?: string; email?: string; signatureUrl?: string }
): ProposalTemplateData {
  const items = valueOr(quote.items, []);
  const prodSub = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  
  // Cálculo do subtotal de personalizações
  const persSub = items.reduce(
    (sum, item) => sum + valueOr(item.personalizations, []).reduce(
      (personalizationSum, personalization) => personalizationSum + valueOr(personalization.total_cost, 0),
      0,
    ),
    0
  );
  
  const fullSubtotal = prodSub + persSub;
  
  const discountValue = quoteDiscount(quote, fullSubtotal);
  const shipValue = quoteShipping(quote);
  const seller = valueOr(sellerInfo, {});
      
  const computedTotal = fullSubtotal - discountValue + shipValue;

  return {
    quoteNumber: valueOr(quote.quote_number, '').replace(/\s+/g, ''),
    date: formatProposalDate(quote.created_at, ''),
    validUntil: formatProposalDate(quote.valid_until, '30 dias'),
    client: {
      name: valueOr(quote.client_company, valueOr(quote.client_name, 'Não especificado')),
      phone: valueOr(quote.client_phone, undefined),
      company: valueOr(quote.client_company, undefined),
      contactName: valueOr(quote.client_name, undefined),
      cnpj: clientCnpj,
    },
    seller: {
      name: valueOr(seller.name, 'Vendedor'),
      email: valueOr(seller.email, undefined),
      signatureUrl: valueOr(seller.signatureUrl, undefined),
    },
    items: items.map(mapProposalItem),
    subtotal: fullSubtotal,
    discount: valueOr(discountValue, undefined),
    shippingCost: valueOr(quote.shipping_cost, undefined),
    shippingType: valueOr(quote.shipping_type, undefined),
    total: computedTotal,
    notes: valueOr(quote.notes, undefined),
    paymentTerms: valueOr(quote.payment_terms, undefined),
    deliveryTime: valueOr(quote.delivery_time, undefined),
  };
}
