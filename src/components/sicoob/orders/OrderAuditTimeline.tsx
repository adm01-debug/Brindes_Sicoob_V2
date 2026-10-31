import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrderAudit, type OrderAuditEvent } from "@/hooks/orders/extensions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, User, Package, FileText, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Filter } from "lucide-react";

import { getStatusConfig } from "@/lib/sicoob-status-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { OrderHistoryDiff } from "./OrderHistoryDiff";
import { SLABadge } from "./SLABadge";


interface OrderAuditTimelineProps {
  orderId: string;
}

type AuditFilters = { event_type: string; startDate: string; endDate: string; search: string };

function eventIcon(event: OrderAuditEvent) {
  if (event.event_type === "status_change") {
    const config = getStatusConfig(event.new_value?.fulfillment_status);
    const StatusIcon = config.icon;
    return <StatusIcon className={cn("h-4 w-4", config.colorClass)} />;
  }
  const icons: Record<string, ReactNode> = { creation: <Package className="h-4 w-4 text-success" />, approval: <CheckCircle2 className="h-4 w-4 text-success" />, rejection: <AlertCircle className="h-4 w-4 text-destructive" /> };
  return icons[event.event_type] ?? <FileText className="h-4 w-4 text-muted-foreground" />;
}

function eventLabel(event: OrderAuditEvent) {
  return event.event_type === "status_change" ? `Status alterado para: ${event.new_value?.fulfillment_status}` : event.event_type;
}

function AuditFiltersPanel({ filters, onChange }: { filters: AuditFilters; onChange: (patch: Partial<AuditFilters>) => void }) {
  return <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20"><div className="space-y-1"><label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Tipo</label><Select value={filters.event_type} onValueChange={(eventType) => onChange({ event_type: eventType })}><SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="status_change">Status</SelectItem><SelectItem value="creation">Criação</SelectItem><SelectItem value="approval">Aprovação</SelectItem><SelectItem value="rejection">Rejeição</SelectItem><SelectItem value="comment">Comentário</SelectItem></SelectContent></Select></div><div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Busca</label><Input placeholder="Filtrar por descrição..." className="h-9" value={filters.search} onChange={(event) => onChange({ search: event.target.value })} /></div><div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">De</label><Input type="date" className="h-9" value={filters.startDate} onChange={(event) => onChange({ startDate: event.target.value })} /></div><div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Até</label><Input type="date" className="h-9" value={filters.endDate} onChange={(event) => onChange({ endDate: event.target.value })} /></div></div>;
}

function EventAuthor({ event }: { event: OrderAuditEvent }) {
  if (!event.created_by_name && !event.actor_role) return null;
  return <div className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" /><span>{event.created_by_name || "Sistema"} {event.actor_role ? `(${event.actor_role})` : ""}</span></div>;
}

function EventDetails({ event }: { event: OrderAuditEvent }) {
  return <><EventAuthor event={event} />{event.event_type === "status_change" ? <OrderHistoryDiff oldValue={event.old_value?.fulfillment_status} newValue={event.new_value?.fulfillment_status} /> : null}{event.observations ? <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{event.observations}</p> : null}</>;
}

function AuditEventRow({ event }: { event: OrderAuditEvent }) {
  const criticalClass = event.event_type === "status_change" && event.new_value?.sla_status === "critical" ? "border-destructive ring-2 ring-destructive/20" : "";
  const occurredAt = event.created_at ?? event.occurred_at ?? Date.now();
  return <div className="relative flex items-start gap-4 pl-1"><div className="flex flex-col items-center"><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm z-10", criticalClass)}>{eventIcon(event)}</div></div><div className="flex flex-col gap-1 pt-1.5 flex-1"><div className="flex items-center gap-2"><span className="text-sm font-semibold">{eventLabel(event)}</span><span className="text-xs text-muted-foreground">{format(new Date(occurredAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>{event.new_value?.sla_status ? <SLABadge status={event.new_value.sla_status} className="scale-75 origin-left" /> : null}</div><EventDetails event={event} /></div></div>;
}

function AuditEvents({ events }: { events: OrderAuditEvent[] | undefined }) {
  return <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">{events?.map((event) => <AuditEventRow key={event.id} event={event} />)}{!events?.length ? <p className="text-center py-8 text-muted-foreground text-sm">Nenhum evento registrado ainda.</p> : null}</div>;
}

function AuditPagination({ totalCount, page, pageSize, setPage }: { totalCount: number | null | undefined; page: number; pageSize: number; setPage: (updater: (page: number) => number) => void }) {
  if (!totalCount || totalCount <= pageSize) return null;
  return <div className="mt-8 flex items-center justify-between border-t pt-4"><p className="text-xs text-muted-foreground">Mostrando {Math.min(totalCount, (page - 1) * pageSize + 1)} a {Math.min(totalCount, page * pageSize)} de {totalCount} eventos</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button><span className="text-xs font-medium">Página {page}</span><Button variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={page * pageSize >= totalCount}><ChevronRight className="h-4 w-4" /></Button></div></div>;
}

export const OrderAuditTimeline = ({ orderId }: OrderAuditTimelineProps) => {
  const [filters, setFilters] = useState({ event_type: 'all', startDate: '', endDate: '', search: '' });
  const { auditEvents, totalCount, isLoading, page, setPage, pageSize } = useOrderAudit(orderId, filters);

  const changeFilters = (patch: Partial<AuditFilters>) => { setFilters((previous) => ({ ...previous, ...patch })); setPage(1); };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-10 bg-muted animate-pulse rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico do Pedido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AuditFiltersPanel filters={filters} onChange={changeFilters} />
        <AuditEvents events={auditEvents} />
        <AuditPagination totalCount={totalCount} page={page} pageSize={pageSize} setPage={setPage} />
      </CardContent>
    </Card>
  );
};
