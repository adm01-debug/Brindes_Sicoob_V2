import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Circle, ArrowRight } from "lucide-react";
import { useOrderAudit } from "@/hooks/useOrderAudit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderAuditTimelineProps {
  orderId: string;
}

export function OrderAuditTimeline({ orderId }: OrderAuditTimelineProps) {
  const { data: events, isLoading } = useOrderAudit(orderId);

  if (isLoading) return <div className="h-32 flex items-center justify-center">Carregando histórico...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Histórico Completo (Auditoria)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-0.5 before:-translate-x-px before:bg-muted">
          {events?.map((event) => (
            <div key={event.id} className="relative flex items-start gap-4 pl-8">
              <span className="absolute left-0 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-muted">
                <Circle className="h-2 w-2 fill-primary text-primary" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{event.description}</p>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(event.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                   <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                     {event.metadata.old_status && (
                       <>
                         <span>{event.metadata.old_status}</span>
                         <ArrowRight className="h-3 w-3" />
                       </>
                     )}
                     <span className="font-semibold">{event.metadata.new_status || JSON.stringify(event.metadata)}</span>
                   </div>
                )}
              </div>
            </div>
          ))}
          {(!events || events.length === 0) && (
            <p className="text-sm text-muted-foreground pl-8 italic">Sem eventos registrados.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
