import React from "react";
import { type QuoteTemplate } from "@/hooks/useQuoteTemplates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/quote-calculations";
import { Package, CreditCard, Clock, Truck, FileText } from "lucide-react";

interface QuoteTemplatePreviewProps {
  data: Partial<QuoteTemplate>;
}

export function QuoteTemplatePreview({ data }: QuoteTemplatePreviewProps) {
  const items = (data.items_data as any[]) || [];
  
  const itemsTotal = items.reduce((sum, item) => {
    const itemBase = item.quantity * item.unitPrice;
    const personalizationCost = item.personalizations?.reduce((pSum: number, p: any) => {
      return pSum + (p.unitCost || 0) * item.quantity + (p.setupCost || 0);
    }, 0) || 0;
    return sum + itemBase + personalizationCost;
  }, 0);

  const discountValue = data.discount_percent && data.discount_percent > 0
    ? itemsTotal * (data.discount_percent / 100)
    : (data.discount_amount || 0);

  const total = itemsTotal - discountValue;

  return (
    <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-primary mb-1">
          <Eye className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Preview do Template</span>
        </div>
        <CardTitle className="text-xl font-bold">{data.name || "Nome do Template"}</CardTitle>
        <CardDescription className="line-clamp-2">
          {data.description || "O preview mostrará como os dados serão aplicados ao orçamento."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Package className="h-3.5 w-3.5" /> Itens Inclusos
          </h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum item adicionado.</p>
            ) : (
              items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-2 text-sm bg-white p-2 rounded-lg border border-border/40">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.quantity}x {item.productName}</p>
                    {item.colorName && <p className="text-[10px] text-muted-foreground">Cor: {item.colorName}</p>}
                  </div>
                  <span className="font-semibold shrink-0">{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo Financeiro</h4>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(itemsTotal)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto ({data.discount_percent}% ou fixo)</span>
                <span>-{formatCurrency(discountValue)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-primary pt-1">
              <span>Total Estimado</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Pagamento
            </h4>
            <p className="text-xs font-medium truncate">{data.payment_terms || "—"}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Entrega
            </h4>
            <p className="text-xs font-medium truncate">{data.delivery_time || "—"}</p>
          </div>
        </div>

        {data.notes && (
          <div className="space-y-1 bg-muted/30 p-2 rounded-lg">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Observações
            </h4>
            <p className="text-[11px] line-clamp-2 italic">{data.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Eye } from "lucide-react";
