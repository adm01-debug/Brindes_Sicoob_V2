import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, PieChart } from 'lucide-react';
import { type OrderRow } from '@/hooks/orders/useOrders';
import { formatCurrency } from '@/utils/quote-calculations';

interface FinancialPanelProps {
  order: OrderRow;
}

export function FinancialPanel({ order }: FinancialPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <DollarSign className="h-4 w-4 text-primary" /> Painel Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(order.subtotal || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Desconto</span>
            <span className="text-destructive">-{formatCurrency(order.discount_amount || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Frete</span>
            <span>{formatCurrency(order.shipping_cost || 0)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 font-bold">
            <span>Total</span>
            <span className="text-lg text-primary">{formatCurrency(order.total || 0)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded bg-muted/30 p-2 text-[10px] text-muted-foreground">
          <PieChart className="h-3 w-3" />
          <span>Margem não calculada: custos dos itens não disponíveis.</span>
        </div>
      </CardContent>
    </Card>
  );
}
