import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Circle, ArrowRight, Filter, SortAsc, SortDesc } from "lucide-react";
import { useOrderAudit } from "@/hooks/useOrderAudit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface OrderAuditTimelineProps {
  orderId: string;
}

export function OrderAuditTimeline({ orderId }: OrderAuditTimelineProps) {
  const { data: events, isLoading } = useOrderAudit(orderId);
  const [filter, setFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  if (isLoading) return <div className="h-32 flex items-center justify-center">Carregando histórico...</div>;

  const filteredEvents = events
    ?.filter((e) => {
      if (filter === "all") return true;
      if (filter === "status") return e.event_type === "status_change";
      if (filter === "comment") return e.event_type === "comment";
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Timeline de Auditoria
        </CardTitle>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>Todos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("status")}>Mudanças de Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("comment")}>Comentários</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-0.5 before:-translate-x-px before:bg-muted">
          {filteredEvents?.map((event) => (
            <div key={event.id} className="relative flex items-start gap-4 pl-8">
              <span className="absolute left-0 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-muted">
                <Circle className={`h-2 w-2 fill-current ${event.event_type === 'status_change' ? 'text-primary' : 'text-muted-foreground'}`} />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{event.description}</p>
                    {event.created_by_name && (
                      <span className="text-[10px] text-muted-foreground">Por: {event.created_by_name}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(event.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                   <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                     {event.metadata.old_status && (
                       <>
                         <Badge variant="outline" className="text-[10px] font-normal">{event.metadata.old_status}</Badge>
                         <ArrowRight className="h-3 w-3" />
                       </>
                     )}
                     <Badge variant="secondary" className="text-[10px]">{event.metadata.new_status || JSON.stringify(event.metadata)}</Badge>
                   </div>
                )}
                
                {event.observations && (
                  <p className="mt-1 text-[11px] text-muted-foreground italic">
                    "{event.observations}"
                  </p>
                )}
              </div>
            </div>
          ))}
          {(!filteredEvents || filteredEvents.length === 0) && (
            <p className="text-sm text-muted-foreground pl-8 italic text-center">Sem eventos encontrados para este filtro.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

