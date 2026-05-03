import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/formatters";
import { OrderRow } from "@/types/orders";

interface OrderSummaryProps {
  order: OrderRow;
}

export function OrderSummary({ order }: OrderSummaryProps) {
  return (
    <div className="space-y-2 mt-4">
      {order.subtotal != null && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal:</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
      )}
      {(order.discount_amount || 0) > 0 && (
        <div className="flex justify-between text-sm text-destructive">
          <span>Desconto:</span>
          <span>-{formatCurrency(order.discount_amount || 0)}</span>
        </div>
      )}
      {(order.shipping_cost || 0) > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Frete:</span>
          <span>{formatCurrency(order.shipping_cost || 0)}</span>
        </div>
      )}
      <Separator />
      <div className="flex justify-between font-bold text-lg">
        <span>Total:</span>
        <span className="text-primary">{formatCurrency(order.total || 0)}</span>
      </div>
    </div>
  );
}
