
import { type QuoteItem, type QuoteItemPersonalization } from "@/hooks/useQuotes";

export const calculateItemPersonalizationTotal = (item: QuoteItem) => {
  return (item.personalizations || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
};

export const calculateItemTotal = (item: QuoteItem) => {
  return item.quantity * item.unit_price + calculateItemPersonalizationTotal(item);
};

export const calculateQuoteTotals = (
  items: QuoteItem[],
  negotiationMarkup: number,
  discountType: "percent" | "amount",
  discountValue: number
) => {
  const realSubtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const markup = Math.min(50, Math.max(0, negotiationMarkup || 0));
  
  const subtotal = markup > 0 
    ? Math.round(realSubtotal * (1 + markup / 100) * 100) / 100 
    : realSubtotal;

  const discountAmount = discountType === "percent" 
    ? subtotal * (discountValue / 100) 
    : discountValue;

  const total = Math.max(0, subtotal - discountAmount);

  // Desconto REAL (sobre subtotal real) — usado para alçada
  const realDiscountPercent = realSubtotal <= 0 
    ? 0 
    : Math.round(((realSubtotal - (subtotal - discountAmount)) / realSubtotal) * 10000) / 100;

  return {
    realSubtotal,
    markup,
    subtotal,
    discountAmount,
    total,
    realDiscountPercent
  };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};
