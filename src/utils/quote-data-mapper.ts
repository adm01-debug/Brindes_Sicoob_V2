import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Quote } from '@/hooks/quotes/quoteTypes';
import { type ProposalTemplateData } from '@/components/pdf/ProposalHtmlTemplate';

/**
 * Mapeia um objeto Quote para o formato ProposalTemplateData usado nos templates de PDF e aprovação.
 */
export function mapQuoteToProposalData(
  quote: Quote, 
  clientCnpj?: string, 
  sellerInfo?: { name?: string; email?: string; signatureUrl?: string }
): ProposalTemplateData {
  const prodSub = (quote.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
  
  // Cálculo do subtotal de personalizações
  const persSub = (quote.items || []).reduce(
    (s, i) =>
      s +
      (i.personalizations || []).reduce(
        (ps: number, p: any) => ps + (p.total_cost || 0),
        0
      ),
    0
  );
  
  const fullSubtotal = prodSub + persSub;
  
  const discountValue = quote.discount_percent
    ? Math.round(fullSubtotal * (quote.discount_percent / 100) * 100) / 100
    : quote.discount_amount || 0;
    
  const shipValue =
    quote.shipping_type === 'fob' || quote.shipping_type === 'fob_pre'
      ? quote.shipping_cost || 0
      : 0;
      
  const computedTotal = fullSubtotal - discountValue + shipValue;

  return {
    quoteNumber: (quote.quote_number || '').replace(/\s+/g, ''),
    date: quote.created_at
      ? format(new Date(quote.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : '',
    validUntil: quote.valid_until
      ? format(new Date(quote.valid_until), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : '30 dias',
    client: {
      name: quote.client_company || quote.client_name || 'Não especificado',
      phone: quote.client_phone || undefined,
      company: quote.client_company || undefined,
      contactName: quote.client_name || undefined,
      cnpj: clientCnpj,
    },
    seller: {
      name: sellerInfo?.name || 'Vendedor',
      email: sellerInfo?.email || undefined,
      signatureUrl: sellerInfo?.signatureUrl || undefined,
    },
    items: (quote.items || []).map((item) => ({
      name: item.product_name,
      sku: item.product_sku || undefined,
      composedCode: item.product_sku
        ? item.color_name
          ? `${item.product_sku}-${item.color_name}`
          : item.product_sku
        : undefined,
      colorHex: item.color_hex || undefined,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      color: item.color_name || undefined,
      imageUrl: item.product_image_url || undefined,
      personalizations: (item.personalizations || []).map((p: any) => ({
        technique_name: p.technique_name || 'Personalização',
        colors_count: p.colors_count || 1,
        width_cm: p.width_cm || undefined,
        height_cm: p.height_cm || undefined,
        area_cm2: p.area_cm2 || undefined,
        unit_cost: p.unit_cost || 0,
        setup_cost: p.setup_cost || 0,
        total_cost: p.total_cost || 0,
        notes: p.notes || undefined,
      })),
      kit_group_id: item.kit_group_id || null,
      kit_name: item.kit_name || null,
    })),
    subtotal: fullSubtotal,
    discount: discountValue || undefined,
    shippingCost: quote.shipping_cost || undefined,
    shippingType: quote.shipping_type || undefined,
    total: computedTotal,
    notes: quote.notes || undefined,
    paymentTerms: quote.payment_terms || undefined,
    deliveryTime: quote.delivery_time || undefined,
  };
}
