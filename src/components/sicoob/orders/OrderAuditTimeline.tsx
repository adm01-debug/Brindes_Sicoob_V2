import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrderAudit } from "@/hooks/useOrderExtensions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, User, Package, FileText, CheckCircle2, Truck, AlertCircle, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { SicoobStatusBadge } from "@/components/sicoob/SicoobStatusBadge";
import { getStatusConfig } from "@/lib/sicoob-status-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { OrderHistoryDiff } from "./OrderHistoryDiff";


interface OrderAuditTimelineProps {
  orderId: string;
}

export const OrderAuditTimeline = ({ orderId }: OrderAuditTimelineProps) => {
  const [filters, setFilters] = useState({ event_type: 'all', startDate: '', endDate: '', search: '' });
  const { auditEvents, totalCount, isLoading, page, setPage, pageSize } = useOrderAudit(orderId, filters);

  const getEventIcon = (type: string, event: any) => {
    if (type === 'status_change') {
      const status = event.new_value?.fulfillment_status;
      const config = getStatusConfig(status);
      const StatusIcon = config.icon;
      return <StatusIcon className={cn("h-4 w-4", config.colorClass)} />;
    }
    switch (type) {
      case 'creation': return <Package className="h-4 w-4 text-success" />;
      case 'approval': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'rejection': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
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
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" /> Tipo
            </label>
            <Select 
              value={filters.event_type} 
              onValueChange={(v) => { setFilters(prev => ({ ...prev, event_type: v })); setPage(1); }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="status_change">Status</SelectItem>
                <SelectItem value="creation">Criação</SelectItem>
                <SelectItem value="approval">Aprovação</SelectItem>
                <SelectItem value="rejection">Rejeição</SelectItem>
                <SelectItem value="comment">Comentário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Busca</label>
            <Input 
              placeholder="Filtrar por descrição..."
              className="h-9" 
              value={filters.search}
              onChange={(e) => { setFilters(prev => ({ ...prev, search: e.target.value })); setPage(1); }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <Input 
              type="date" 
              className="h-9" 
              value={filters.startDate}
              onChange={(e) => { setFilters(prev => ({ ...prev, startDate: e.target.value })); setPage(1); }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <Input 
              type="date" 
              className="h-9" 
              value={filters.endDate}
              onChange={(e) => { setFilters(prev => ({ ...prev, endDate: e.target.value })); setPage(1); }}
            />
          </div>
        </div>

        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
          {auditEvents?.map((event, idx) => (
            <div key={event.id} className="relative flex items-start gap-4 pl-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm z-10">
                {getEventIcon(event.event_type, event)}
              </div>
              <div className="flex flex-col gap-1 pt-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{getEventLabel(event)}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {(event.created_by_name || event.actor_role) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{event.created_by_name || "Sistema"} {event.actor_role ? `(${event.actor_role})` : ""}</span>
                  </div>
                )}
                {event.observations && (
                  <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{event.observations}</p>
                )}
              </div>
            </div>
          ))}
          {!auditEvents?.length && (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhum evento registrado ainda.</p>
          )}
        </div>

        {totalCount && totalCount > pageSize && (
          <div className="mt-8 flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Mostrando {Math.min(totalCount, (page - 1) * pageSize + 1)} a {Math.min(totalCount, page * pageSize)} de {totalCount} eventos
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium">Página {page}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= totalCount}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
