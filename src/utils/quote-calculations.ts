
import { type QuoteItem } from "@/hooks/quotes/useQuotes";

export const calculateItemPersonalizationTotal = (item: QuoteItem) => {
  return (item.personalizations || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
};

export const calculateItemPersonalizationCost = (item: QuoteItem) => {
  // Assume personalização tem um custo base. Se não houver cost explícito, usamos o total_cost como custo
  // mas idealmente personalizações têm unit_cost + setup_cost.
  return (item.personalizations || []).reduce((sum, p) => {
    const unitCost = p.unit_cost || 0;
    const setupCost = p.setup_cost || 0;
    const qty = p.personalized_quantity || item.quantity;
    return sum + (unitCost * qty) + setupCost;
  }, 0);
};

export const calculateItemTotal = (item: QuoteItem) => {
  return item.quantity * item.unit_price + calculateItemPersonalizationTotal(item);
};

export const calculateItemCost = (item: QuoteItem) => {
  const productCost = (item.unit_cost || item.unit_price * 0.7) * item.quantity; // Fallback 70% se não houver custo
  return productCost + calculateItemPersonalizationCost(item);
};

interface QuoteTotalsInput {
  items: QuoteItem[];
  negotiationMarkup: number;
  discountType: "percent" | "amount" | string;
  discountValue: number;
  shippingCost?: number;
  shippingType?: string;
}

export const calculateQuoteTotals = ({
  items,
  negotiationMarkup,
  discountType,
  discountValue,
  shippingCost = 0,
  shippingType = "cif",
}: QuoteTotalsInput) => {
  const realSubtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const totalCost = items.reduce((sum, item) => sum + calculateItemCost(item), 0);
  
  const markup = Math.min(50, Math.max(0, negotiationMarkup || 0));
  
  const subtotal = markup > 0 
    ? Math.round(realSubtotal * (1 + markup / 100) * 100) / 100 
    : realSubtotal;

  const discountAmount = discountType === "percent" 
    ? subtotal * (discountValue / 100) 
    : discountValue;

  const shippingValue = (shippingType === "fob" || shippingType === "fob_pre") ? shippingCost : 0;
  const total = Math.max(0, subtotal - discountAmount + shippingValue);

  // Desconto REAL (sobre subtotal real) — usado para alçada
  const realDiscountPercent = realSubtotal <= 0 
    ? 0 
    : Math.round(((realSubtotal - (subtotal - discountAmount)) / realSubtotal) * 10000) / 100;

  // Margem (Lucro / Total)
  const profit = total - totalCost;
  const marginPercent = total > 0 ? (profit / total) * 100 : 0;

  return {
    realSubtotal,
    markup,
    subtotal,
    discountAmount,
    total,
    realDiscountPercent,
    totalCost,
    profit,
    marginPercent
  };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};
