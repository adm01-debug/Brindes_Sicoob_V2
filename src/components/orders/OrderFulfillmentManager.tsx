/**
 * OrderFulfillmentManager — controle de fulfillment + tracking + transportadora.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck } from "lucide-react";
import { useUpdateOrder, FULFILLMENT_LABELS, canTransitionTo, ORDER_STATUS_LABELS, type OrderRow } from "@/hooks/useOrders";

interface OrderFulfillmentManagerProps {
  order: OrderRow;
}

export function OrderFulfillmentManager({ order }: OrderFulfillmentManagerProps) {
  const update = useUpdateOrder(order.id, order.status);
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [shippingType, setShippingType] = useState(order.shipping_type ?? "");
  const [carrier, setCarrier] = useState((order as any).shipping_carrier ?? "");
  const [deliveryForecast, setDeliveryForecast] = useState((order as any).shipping_delivery_forecast ? new Date((order as any).shipping_delivery_forecast).toISOString().split('T')[0] : "");

  const dirty =
    tracking !== (order.tracking_number ?? "") || 
    shippingType !== (order.shipping_type ?? "") ||
    carrier !== ((order as any).shipping_carrier ?? "") ||
    deliveryForecast !== ((order as any).shipping_delivery_forecast ? new Date((order as any).shipping_delivery_forecast).toISOString().split('T')[0] : "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4 text-primary" /> Logística
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ful-status">Fulfillment</Label>
            <Select
              value={order.fulfillment_status}
              onValueChange={(v) => {
                if (!canTransitionTo(order.fulfillment_status, v)) {
                  toast.error(`Transição inválida de ${FULFILLMENT_LABELS[order.fulfillment_status] || order.fulfillment_status} para ${FULFILLMENT_LABELS[v] || v}`);
                  return;
                }
                update.mutate({ fulfillment_status: v });
              }}
              disabled={update.isPending}
            >
              <SelectTrigger id="ful-status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FULFILLMENT_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ship-type">Tipo de frete</Label>
            <Input
              id="ship-type"
              value={shippingType}
              onChange={(e) => setShippingType(e.target.value)}
              placeholder="PAC, SEDEX, transportadora..."
              className="mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="carrier">Transportadora</Label>
            <Input
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Ex: Braspress, Correios..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="forecast">Previsão de Entrega</Label>
            <Input
              id="forecast"
              type="date"
              value={deliveryForecast}
              onChange={(e) => setDeliveryForecast(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tracking">Código de rastreio</Label>
          <Input
            id="tracking"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Ex: BR123456789BR"
            className="mt-1"
          />
        </div>
        <Button
          onClick={() =>
            update.mutate({
              tracking_number: tracking || null,
              shipping_type: shippingType || null,
              shipping_carrier: carrier || null,
              shipping_delivery_forecast: deliveryForecast || null,
            } as any)
          }
          disabled={!dirty || update.isPending}
          size="sm"
        >
          {update.isPending ? "Salvando..." : "Salvar logística"}
        </Button>
      </CardContent>
    </Card>
  );
}
