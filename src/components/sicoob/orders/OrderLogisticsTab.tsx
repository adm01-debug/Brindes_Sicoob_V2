import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Calendar, MapPin, Package } from "lucide-react";
import { useOrderLogistics } from "@/hooks/useOrderExtensions";
import { Badge } from "@/components/ui/badge";

interface OrderLogisticsTabProps {
  orderId: string;
}

export function OrderLogisticsTab({ orderId }: OrderLogisticsTabProps) {
  const { logistics, updateLogistics, isLoading } = useOrderLogistics(orderId);
  const [trackingCode, setTrackingCode] = useState("");
  const [carrier, setCarrier] = useState("");

  const handleUpdateTracking = () => {
    updateLogistics.mutate({
      tracking_code: trackingCode,
      carrier: carrier,
      status: 'in_transit'
    });
  };

  if (isLoading) return <div className="p-8 text-center">Carregando dados logísticos...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Transportadora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{logistics?.carrier || "Não informada"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Código de Rastreio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{logistics?.tracking_code || "---"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Previsão de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {logistics?.estimated_delivery ? new Date(logistics.estimated_delivery).toLocaleDateString('pt-BR') : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atualizar Informações de Rastreio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Transportadora</Label>
              <Input 
                id="carrier" 
                placeholder="Ex: Braspress, Correios" 
                value={carrier} 
                onChange={(e) => setCarrier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking">Código de Rastreio</Label>
              <Input 
                id="tracking" 
                placeholder="Código de rastreamento" 
                value={trackingCode} 
                onChange={(e) => setTrackingCode(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={handleUpdateTracking} 
            disabled={updateLogistics.isPending || (!trackingCode && !carrier)}
          >
            {updateLogistics.isPending ? "Salvando..." : "Salvar Informações"}
          </Button>
        </CardContent>
      </Card>

      {logistics?.delivery_photo_url && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comprovante de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={logistics.delivery_photo_url} 
              alt="Comprovante de entrega" 
              className="max-w-md rounded-lg border shadow-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
