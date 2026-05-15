import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Loader2, Save } from "lucide-react";
import { useOrderLogistics } from "@/hooks/useOrderExtensions";
import { FULFILLMENT_LABELS, canTransitionTo } from "@/constants/orders";

interface OrderFulfillmentManagerProps {
  orderId: string;
  currentFulfillmentStatus: string;
}

export function OrderFulfillmentManager({ orderId, currentFulfillmentStatus }: OrderFulfillmentManagerProps) {
  const { logistics, isLoading, updateLogistics } = useOrderLogistics(orderId);
  
  const [tracking, setTracking] = useState("");
  const [shippingType, setShippingType] = useState("");
  const [carrier, setCarrier] = useState("");
  const [deliveryForecast, setDeliveryForecast] = useState("");

  // Sync internal state when data loads
  useEffect(() => {
    if (logistics) {
      setTracking(logistics.tracking_number ?? "");
      setShippingType(logistics.shipping_type ?? "");
      setCarrier(logistics.carrier ?? "");
      setDeliveryForecast(logistics.estimated_delivery ? new Date(logistics.estimated_delivery).toISOString().split('T')[0] : "");
    }
  }, [logistics]);

  const dirty = logistics ? (
    tracking !== (logistics.tracking_number ?? "") || 
    shippingType !== (logistics.shipping_type ?? "") ||
    carrier !== (logistics.carrier ?? "") ||
    deliveryForecast !== (logistics.estimated_delivery ? new Date(logistics.estimated_delivery).toISOString().split('T')[0] : "")
  ) : (tracking || shippingType || carrier || deliveryForecast);

  const handleSave = () => {
    updateLogistics.mutate({
      tracking_number: tracking || null,
      shipping_type: shippingType || null,
      carrier: carrier || null,
      estimated_delivery: deliveryForecast || null,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando dados logísticos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4 text-primary" /> Dados de Logística
        </CardTitle>
        <CardDescription>Gerencie o rastreio e transporte deste pedido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ship-type">Tipo de Frete</Label>
            <Input
              id="ship-type"
              value={shippingType}
              onChange={(e) => setShippingType(e.target.value)}
              placeholder="Ex: Correios, Transportadora..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carrier">Empresa de Transporte</Label>
            <Input
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Nome da transportadora"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tracking">Código de Rastreio</Label>
            <Input
              id="tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Código para acompanhamento"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forecast">Previsão de Entrega</Label>
            <Input
              id="forecast"
              type="date"
              value={deliveryForecast}
              onChange={(e) => setDeliveryForecast(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={!dirty || updateLogistics.isPending}
            className="gap-2"
          >
            {updateLogistics.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Logística
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

