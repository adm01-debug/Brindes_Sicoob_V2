import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrderAudit } from "@/hooks/useOrderExtensions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, User, Package, FileText, CheckCircle2, Truck, AlertCircle } from "lucide-react";

interface OrderAuditTimelineProps {
  orderId: string;
}

export const OrderAuditTimeline = ({ orderId }: OrderAuditTimelineProps) => {
  const { auditEvents, isLoading } = useOrderAudit(orderId);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'status_change': return <Truck className="h-4 w-4 text-blue-500" />;
      case 'creation': return <Package className="h-4 w-4 text-emerald-500" />;
      case 'approval': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'rejection': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const getEventLabel = (event: any) => {
    if (event.event_type === 'status_change') {
      const newStatus = event.new_value?.fulfillment_status;
      return `Status alterado para: ${newStatus}`;
    }
    return event.event_type;
  };

  if (isLoading) return <div className="p-4 text-center">Carregando linha do tempo...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico do Pedido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {auditEvents?.map((event, idx) => (
            <div key={event.id} className="relative flex items-start gap-4 pl-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm z-10">
                {getEventIcon(event.event_type)}
              </div>
              <div className="flex flex-col gap-1 pt-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{getEventLabel(event)}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {event.actor_id && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Realizado por sistema/usuário</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!auditEvents?.length && (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhum evento registrado ainda.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
