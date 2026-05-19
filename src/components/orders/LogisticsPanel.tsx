import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Calendar } from "lucide-react";
import { type OrderRow } from "@/hooks/orders/useOrders";
import { Badge } from "@/components/ui/badge";

interface LogisticsPanelProps {
  order: OrderRow;
}

export function LogisticsPanel({ order }: LogisticsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> Painel de Logística
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Transportadora</p>
            <p className="text-sm font-medium">{(order as any).shipping_carrier || "Não informada"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Código de Rastreio</p>
            <p className="text-sm font-mono">{order.tracking_number || "---"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold">Status de Entrega</p>
            <Badge variant="outline" className="mt-1">{order.status}</Badge>
          </div>
          <div className="text-right">
            <Calendar className="h-4 w-4 text-muted-foreground ml-auto" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {(order as any).shipping_delivery_forecast ? new Date((order as any).shipping_delivery_forecast).toLocaleDateString() : "Sem previsão"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
