/**
 * QuoteTotalsSummary — Totals breakdown card for QuoteViewPage
 */

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcPersTotal(totalCost: number, qty: number): number {
  if (qty <= 0) return totalCost;
  const roundedUnit = Math.round((totalCost / qty) * 100) / 100;
  return Math.round(roundedUnit * qty * 100) / 100;
}

interface QuoteTotalsSummaryProps {
  items: Array<{
    quantity: number;
    unit_price: number;
    unit_cost?: number | null;
    personalizations?: Array<{ total_cost?: number | null }> | null;
  }>;
  discountPercent?: number;
  discountAmount?: number;
  shippingType?: string | null;
  shippingCost?: number | null;
}

function personalizationTotal(items: QuoteTotalsSummaryProps["items"]) {
  return items.reduce((accumulator, item) => {
    const itemTotal = (item.personalizations || []).reduce(
      (subtotal, personalization) => subtotal + calcPersTotal(personalization.total_cost || 0, item.quantity),
      0,
    );
    return accumulator + itemTotal;
  }, 0);
}

function discountValue(subtotal: number, percent?: number, amount?: number) {
  if (percent) return Math.round(subtotal * (percent / 100) * 100) / 100;
  return amount || 0;
}

function shippingValue(type?: string | null, cost?: number | null) {
  if (type === "fob" || type === "fob_pre") return cost || 0;
  return 0;
}

function shippingLabel(type: string, cost?: number | null) {
  if (type === "cif") return "CIF — Cortesia";
  if (type === "fob" && !cost) return "FOB — Por conta do cliente";
  if (type === "fob" || type === "fob_pre") return `FOB — Repassado ao cliente (${formatCurrency(cost || 0)})`;
  return formatCurrency(cost || 0);
}

function OptionalTotalRow({ visible, label, value, destructive = false }: { visible: boolean; label: string; value: string; destructive?: boolean }) {
  if (!visible) return null;
  return (
    <div className={`flex justify-between text-sm ${destructive ? "text-destructive" : ""}`}>
      <span className={destructive ? undefined : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ShippingRow({ type, cost }: { type?: string | null; cost?: number | null }) {
  if (!type) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Frete:</span>
      <span>{shippingLabel(type, cost)}</span>
    </div>
  );
}

export function QuoteTotalsSummary({ items, discountPercent, discountAmount, shippingType, shippingCost }: QuoteTotalsSummaryProps) {
  const productSubtotal = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const totalCost = items.reduce((acc, item) => acc + (item.quantity * (item.unit_cost || 0)), 0);
  
  const personalizationAmount = personalizationTotal(items);

  const fullSubtotal = productSubtotal + personalizationAmount;
  const appliedDiscount = discountValue(fullSubtotal, discountPercent, discountAmount);

  const appliedShipping = shippingValue(shippingType, shippingCost);

  const computedTotal = fullSubtotal - appliedDiscount + appliedShipping;
  const netRevenue = computedTotal - appliedShipping; // Receita líquida sem o frete repassado
  const profit = netRevenue - totalCost;
  const margin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-sm rounded-lg border border-border overflow-hidden">
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal produtos:</span>
            <span>{formatCurrency(productSubtotal)}</span>
          </div>
          <OptionalTotalRow visible={personalizationAmount > 0} label="Personalização:" value={formatCurrency(personalizationAmount)} />
          <OptionalTotalRow visible={appliedDiscount > 0} label={`Desconto${discountPercent ? ` (${discountPercent}%)` : ""}:`} value={`-${formatCurrency(appliedDiscount)}`} destructive />
          <ShippingRow type={shippingType} cost={shippingCost} />
        </div>
        <div className="bg-muted/50 border-t border-border px-4 py-3 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-lg">Total:</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(computedTotal)}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t border-border/50">
            <span className="text-xs font-medium text-muted-foreground uppercase">Rentabilidade Est.</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${margin < 20 ? "text-destructive" : "text-success"}`}>
                {margin.toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({formatCurrency(profit)})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
