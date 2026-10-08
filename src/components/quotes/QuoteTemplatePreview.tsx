import React from "react";
import { type QuoteTemplate, type QuoteTemplateItem } from "@/hooks/useQuoteTemplates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/quote-calculations";
import { Package, CreditCard, Clock, FileText, Eye } from "lucide-react";

interface QuoteTemplatePreviewProps {
  data: Partial<QuoteTemplate>;
}

function calculateItemsTotal(items: QuoteTemplateItem[]) {
  return items.reduce((sum, item) => {
    const itemBase = item.quantity * item.unitPrice;
    const personalizationCost = (item.personalizations || []).reduce(
      (subtotal, personalization) => subtotal + (personalization.unitCost || 0) * item.quantity + (personalization.setupCost || 0),
      0,
    );
    return sum + itemBase + personalizationCost;
  }, 0);
}

function TemplateItems({ items }: { items: QuoteTemplateItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground italic">Nenhum item adicionado.</p>;
  return (
    <>
      {items.map((item, index) => (
        <div key={`${item.productId}-${index}`} className="flex justify-between items-start gap-2 text-sm bg-white p-2 rounded-lg border border-border/40">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.quantity}x {item.productName}</p>
            {item.colorName && <p className="text-[10px] text-muted-foreground">Cor: {item.colorName}</p>}
          </div>
          <span className="font-semibold shrink-0">{formatCurrency(item.quantity * item.unitPrice)}</span>
        </div>
      ))}
    </>
  );
}

function FinancialSummary({ subtotal, discount, discountPercent }: { subtotal: number; discount: number; discountPercent?: number | null }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo Financeiro</h4>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
        {discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Desconto ({discountPercent}% ou fixo)</span><span>-{formatCurrency(discount)}</span></div>}
        <div className="flex justify-between text-base font-bold text-primary pt-1"><span>Total Estimado</span><span>{formatCurrency(subtotal - discount)}</span></div>
      </div>
    </div>
  );
}

function TemplateTerms({ data }: { data: Partial<QuoteTemplate> }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1"><h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> Pagamento</h4><p className="text-xs font-medium truncate">{data.payment_terms || "—"}</p></div>
      <div className="space-y-1"><h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Entrega</h4><p className="text-xs font-medium truncate">{data.delivery_time || "—"}</p></div>
    </div>
  );
}

function TemplateNotes({ notes }: { notes?: string | null }) {
  if (!notes) return null;
  return <div className="space-y-1 bg-muted/30 p-2 rounded-lg"><h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Observações</h4><p className="text-[11px] line-clamp-2 italic">{notes}</p></div>;
}

export function QuoteTemplatePreview({ data }: QuoteTemplatePreviewProps) {
  const items: QuoteTemplateItem[] = data.items_data ?? [];

  const itemsTotal = calculateItemsTotal(items);

  const discountValue = data.discount_percent && data.discount_percent > 0
    ? itemsTotal * (data.discount_percent / 100)
    : (data.discount_amount || 0);

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
            <TemplateItems items={items} />
          </div>
        </div>

        <Separator className="opacity-50" />

        <FinancialSummary subtotal={itemsTotal} discount={discountValue} discountPercent={data.discount_percent} />

        <Separator className="opacity-50" />

        <TemplateTerms data={data} />
        <TemplateNotes notes={data.notes} />
      </CardContent>
    </Card>
  );
}
