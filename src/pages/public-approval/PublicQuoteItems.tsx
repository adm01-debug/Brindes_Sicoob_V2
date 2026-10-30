/**
 * Items list and totals extracted from PublicQuoteApprovalPage
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Truck, Palette, Sparkles } from "lucide-react";
import type { QuoteItem } from "@/hooks/quotes/quoteTypes";

const SHIPPING_LABELS: Record<string, string> = {
  cif: "CIF (incluso)",
  fob: "FOB (a cobrar)",
  fob_pre: "FOB Pré-pago",
  retirada: "Retirada",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function calcPersTotal(item: QuoteItem) {
  return (item.personalizations || []).reduce(
    (sum, p) => sum + (p.total_cost || 0), 0
  );
}

interface PublicQuoteItemsProps {
  items: QuoteItem[];
}

export function PublicQuoteItemsList({ items }: PublicQuoteItemsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Itens ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="flex gap-3 py-3 border-b border-border/50 last:border-0">
            {item.product_image_url && (
              <img src={item.product_image_url} alt={item.product_name} className="w-16 h-16 object-cover rounded-lg border border-border/50" loading="lazy" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.product_name}</p>
              {item.product_sku && <p className="text-xs text-muted-foreground font-mono">{item.product_sku}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{item.quantity}x {formatCurrency(item.unit_price)}</span>
                {item.color_name && (
                  <Badge variant="outline" className="text-xs gap-1 h-5">
                    {item.color_hex && <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: item.color_hex }} />}
                    <Palette className="h-2.5 w-2.5" />
                    {item.color_name}
                  </Badge>
                )}
              </div>
              {(item.personalizations?.length ?? 0) > 0 && (
                <div className="mt-2 space-y-1">
                  {item.personalizations?.map((p, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                      <span>{p.technique_name || "Personalização"}</span>
                      {p.notes && <span className="text-muted-foreground/70">• {p.notes}</span>}
                      <span className="ml-auto font-medium">{formatCurrency(p.total_cost || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-sm">{formatCurrency(item.quantity * item.unit_price + calcPersTotal(item))}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface PublicQuoteTotalsProps {
  subtotal: number;
  discountAmount: number;
  discountPercent?: number;
  shippingCost: number;
  shippingType?: string;
  total: number;
}

export function PublicQuoteTotals({ subtotal, discountAmount, discountPercent, shippingCost, shippingType, total }: PublicQuoteTotalsProps) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>Desconto{discountPercent && discountPercent > 0 ? ` (${discountPercent}%)` : ""}</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        {shippingCost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" />
              Frete ({SHIPPING_LABELS[shippingType || ""] || shippingType})
            </span>
            <span>{formatCurrency(shippingCost)}</span>
          </div>
        )}
        {shippingType && !shippingCost && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" />
              Frete
            </span>
            <span>{SHIPPING_LABELS[shippingType] || shippingType}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
