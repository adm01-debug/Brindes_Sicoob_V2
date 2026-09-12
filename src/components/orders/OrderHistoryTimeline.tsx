import React from 'react';
import { useSicoobOrderHistory } from '@/hooks/useSicoobOrderHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderHistoryTimelineProps {
  orderId: string;
}

export function OrderHistoryTimeline({ orderId }: OrderHistoryTimelineProps) {
  const { history, isLoading } = useSicoobOrderHistory(orderId);

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground">Carregando histórico...</div>;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico de Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-muted" />
          {history?.map((event, idx) => (
            <div key={event.id || idx} className="relative flex gap-4 pl-9">
              <div className="absolute left-0 h-7 w-7 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <Clock className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">
                    {event.new_status || event.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {event.created_at && format(new Date(event.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {event.comment && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2 py-1">
                    "{event.comment}"
                  </p>
                )}
              </div>
            </div>
          ))}
          {!history?.length && (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum evento registrado no histórico.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
