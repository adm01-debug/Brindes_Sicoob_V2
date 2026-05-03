import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, PieChart, ArrowUpRight } from "lucide-react";
import { type OrderRow } from "@/hooks/useOrders";
import { formatCurrency } from "@/utils/quote-calculations";

interface FinancialPanelProps {
  order: OrderRow;
}

export function FinancialPanel({ order }: FinancialPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Painel Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(order.subtotal || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Desconto</span>
            <span className="text-destructive">-{formatCurrency(order.discount_amount || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Frete</span>
            <span>{formatCurrency(order.shipping_cost || 0)}</span>
          </div>
          <div className="pt-2 border-t flex justify-between items-center font-bold">
            <span>Total</span>
            <span className="text-lg text-primary">{formatCurrency(order.total || 0)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
          <PieChart className="h-3 w-3" />
          Margem estimada: <span className="font-bold text-foreground">32%</span>
          <ArrowUpRight className="h-3 w-3 text-success" />
        </div>
      </CardContent>
    </Card>
  );
}
