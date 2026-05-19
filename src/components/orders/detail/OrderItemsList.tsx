import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderItem } from "@/types/orders";
import { formatCurrency } from "@/lib/format";

interface OrderItemsListProps {
  items: OrderItem[];
}

export function OrderItemsList({ items }: OrderItemsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-primary" />
          Itens do Pedido ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum item encontrado.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-muted/20">
                {item.product_image_url ? (
                  <img
                    src={item.product_image_url}
                    alt={item.product_name || ""}
                    className="w-14 h-14 rounded-md object-cover border" loading="lazy" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product_name}</p>
                  {item.product_sku && (
                    <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.quantity}x {formatCurrency(item.unit_price || 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
