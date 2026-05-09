import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Calendar, CreditCard, Truck } from "lucide-react";
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

/**
 * Resumo financeiro e de condições comerciais do orçamento.
 */
export function QuoteSummary({
  subtotal,
  discountValue,
  discountType,
  shippingCost,
  total,
  profit,
  marginPercent,
  paymentTerms,
  deliveryTime,
  validUntil,
  className,
  isInternal = false,
}: QuoteSummaryProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const discountAmount = discountType === 'percent' 
    ? (subtotal * discountValue) / 100 
    : discountValue;

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

          {discountValue > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span className="flex items-center gap-1.5">
                Desconto
                <Badge variant="outline" className="text-[10px] h-4 px-1 border-success/30 text-success">
                  {discountType === 'percent' ? `${discountValue}%` : 'Fixo'}
                </Badge>
              </span>
              <span className="font-medium tabular-nums">-{formatCurrency(discountAmount)}</span>
            </div>
          )}

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

          {isInternal && marginPercent !== undefined && (
            <div className={cn(
              "mt-3 p-2 rounded-lg border border-dashed flex items-center justify-between text-xs font-semibold shadow-sm transition-all",
              marginPercent > 30 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : 
              marginPercent > 15 ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400" : 
              "bg-destructive/10 border-destructive/30 text-destructive dark:text-red-400"
            )}>
              <span className="flex items-center gap-1">
                Rentabilidade
              </span>
              <span className="tabular-nums">
                {profit && formatCurrency(profit)} ({marginPercent.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>

        {/* Condições Rápidas */}
        {(paymentTerms || deliveryTime || validUntil) && (
          <div className="pt-4 mt-2 border-t border-dashed border-border grid grid-cols-1 gap-2">
            {paymentTerms && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CreditCard className="h-3 w-3" />
                <span>Pagamento: <strong>{paymentTerms}</strong></span>
              </div>
            )}
            {deliveryTime && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-3 w-3" />
                <span>Entrega: <strong>{deliveryTime}</strong></span>
              </div>
            )}
            {validUntil && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Válido até: <strong>{new Date(validUntil).toLocaleDateString('pt-BR')}</strong></span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
