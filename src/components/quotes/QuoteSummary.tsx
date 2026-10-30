import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Calendar, CreditCard, Truck, TrendingUp, TrendingDown, Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface QuoteSummaryProps {
  subtotal: number;
  discountValue: number;
  discountType: 'percent' | 'amount';
  shippingCost: number;
  total: number;
  profit?: number;
  marginPercent?: number;
  paymentTerms?: string;
  deliveryTime?: string;
  validUntil?: string;
  className?: string;
  isInternal?: boolean;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function marginColor(margin: number, bar = false): string {
  if (margin > 30) return bar ? 'bg-emerald-500 shadow-glow-success' : 'bg-emerald-500/10 text-emerald-600';
  if (margin > 15) return bar ? 'bg-amber-500' : 'bg-amber-500/10 text-amber-600';
  return bar ? 'bg-destructive' : 'bg-destructive/10 text-destructive';
}

function Profitability({ margin, profit }: { margin: number; profit: number | undefined }) {
  return <div className="mt-4 pt-3 border-t border-border/50"><div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Rentabilidade Real</span>
      <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] p-2 max-w-[200px]"><p>A margem é calculada sobre o valor real dos produtos (sem markup psicológico) subtraindo descontos e custos de personalização.</p></TooltipContent>
      </Tooltip></TooltipProvider></div>
    <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold', marginColor(margin))}>
      {margin > 20 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}{margin.toFixed(1)}%
    </div></div>
    <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden mb-1.5"><div
      className={cn('absolute inset-y-0 left-0 transition-all duration-500 rounded-full', marginColor(margin, true))}
      style={{ width: `${Math.max(0, Math.min(margin, 100))}%` }} /><div className="absolute left-[20%] top-0 bottom-0 w-0.5 bg-foreground/20 z-10" /></div>
    <div className="flex justify-between text-[9px] text-muted-foreground font-medium"><span>Crítico</span><span className="text-foreground/40 font-bold">Meta 20%</span><span>Excelente</span></div>
    <div className="mt-2.5 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Lucro Bruto:</span>
      <span className="font-bold text-foreground tabular-nums">{profit === undefined ? '' : formatCurrency(profit)}</span></div>
  </div>;
}

function CommercialTerms({ paymentTerms, deliveryTime, validUntil }: Pick<QuoteSummaryProps, 'paymentTerms' | 'deliveryTime' | 'validUntil'>) {
  if (!paymentTerms && !deliveryTime && !validUntil) return null;
  return <div className="pt-4 mt-2 border-t border-dashed border-border grid grid-cols-1 gap-2">
    {paymentTerms && <div className="flex items-center gap-2 text-xs text-muted-foreground"><CreditCard className="h-3 w-3" /><span>Pagamento: <strong>{paymentTerms}</strong></span></div>}
    {deliveryTime && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Truck className="h-3 w-3" /><span>Entrega: <strong>{deliveryTime}</strong></span></div>}
    {validUntil && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /><span>Válido até: <strong>{new Date(validUntil).toLocaleDateString('pt-BR')}</strong></span></div>}
  </div>;
}

function DiscountRow({ subtotal, value, type }: { subtotal: number; value: number; type: QuoteSummaryProps['discountType'] }) {
  if (value <= 0) return null;
  const amount = type === 'percent' ? (subtotal * value) / 100 : value;
  return <div className="flex justify-between text-sm text-success"><span className="flex items-center gap-1.5">Desconto
    <Badge variant="outline" className="text-[10px] h-4 px-1 border-success/30 text-success">{type === 'percent' ? `${value}%` : 'Fixo'}</Badge></span>
    <span className="font-medium tabular-nums">-{formatCurrency(amount)}</span></div>;
}

/**
 * Resumo financeiro e de condições comerciais do orçamento.
 */
export function QuoteSummary(props: QuoteSummaryProps) {
  const { subtotal, discountValue, discountType, shippingCost, total, profit, marginPercent,
    paymentTerms, deliveryTime, validUntil, className, isInternal = false } = props;
  return (
    <Card className={cn("overflow-hidden border-border/50", className)}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-sm">Resumo de Valores</h3>
        </div>

        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
          </div>

          <DiscountRow subtotal={subtotal} value={discountValue} type={discountType} />

          {shippingCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span className="font-medium tabular-nums">{formatCurrency(shippingCost)}</span>
            </div>
          )}

          <Separator className="my-2" />

          <div className="flex justify-between items-center">
            <span className="font-display font-bold text-base">Total</span>
            <span className="font-display font-bold text-xl text-primary tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>

          {isInternal && marginPercent !== undefined && <Profitability margin={marginPercent} profit={profit} />}
        </div>

        {/* Condições Rápidas */}
        <CommercialTerms paymentTerms={paymentTerms} deliveryTime={deliveryTime} validUntil={validUntil} />
      </CardContent>
    </Card>
  );
}
