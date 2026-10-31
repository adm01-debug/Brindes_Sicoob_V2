import { useLogisticsTracking } from "@/hooks/orders/extensions";

import { Truck, MapPin, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface OrderLogisticsTrackingProps {
  orderId: string;
}

function TrackingCode({ code }: { code: string }) {
  return <div className="p-4 border rounded-lg bg-primary/5 border-primary/10"><div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
      <MapPin className="h-5 w-5 text-primary" />
    </div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Código de Rastreamento</p>
      <p className="text-base font-mono font-bold text-primary">{code}</p>
    </div></div>
    <Badge variant="outline" className="bg-background border-primary/20 text-primary">Em Trânsito</Badge>
  </div></div>;
}

function DeliveryEstimate({ estimated, actual }: { estimated: string | null; actual: string | null }) {
  return <div className="p-4 border rounded-lg bg-card">
    <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-primary" />
      <span className="text-xs font-semibold uppercase text-muted-foreground">Previsão de Entrega</span>
    </div>
    <p className="text-sm font-medium">{estimated
      ? format(new Date(estimated), "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Não disponível"}</p>
    {actual && <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" />Entregue em {format(new Date(actual), "dd/MM/yyyy")}
    </p>}
  </div>;
}

export function OrderLogisticsTracking({ orderId }: OrderLogisticsTrackingProps) {
  const { data: logistics, isLoading } = useLogisticsTracking(orderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!logistics || (!logistics.tracking_number && !logistics.carrier)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg border-dashed bg-muted/5">
        <Truck className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma informação de rastreio disponível.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase text-muted-foreground">Transportadora</span>
          </div>
          <p className="text-sm font-medium">{logistics.carrier || "Não informado"}</p>
          <p className="text-xs text-muted-foreground mt-1">{logistics.shipping_type || "Frete Padrão"}</p>
        </div>

        <DeliveryEstimate estimated={logistics.estimated_delivery} actual={logistics.actual_delivery} />
      </div>

      {logistics.tracking_number && <TrackingCode code={logistics.tracking_number} />}
    </div>
  );
}
