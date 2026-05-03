import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Circle, ArrowRight, Filter, SortAsc, SortDesc, Search, ChevronUp, ChevronDown } from "lucide-react";
import { useOrderAudit } from "@/hooks/useOrderExtensions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface OrderAuditTimelineProps {
  orderId: string;
}

export function OrderAuditTimeline({ orderId }: OrderAuditTimelineProps) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const { events, totalCount, isLoading, page, setPage, pageSize } = useOrderAudit(orderId, { search, type });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  if (isLoading && page === 1) return <div className="h-32 flex items-center justify-center">Carregando histórico...</div>;

  const sortedEvents = events ? [...events].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  }) : [];

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-4 pb-3">
        <div className="flex flex-row items-center justify-between">
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
                <DropdownMenuItem onClick={() => setType("all")}>Todos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setType("status_change")}>Mudanças de Status</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setType("comment")}>Comentários</DropdownMenuItem>
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
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar eventos..." 
            className="pl-8 h-8 text-xs" 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {totalCount !== undefined && totalCount > pageSize && (
          <div className="flex items-center justify-center gap-2 py-2 border-b mb-4">
            <Button 
              variant="ghost" 
              size="xs" 
              className="h-7 text-[10px]" 
              onClick={() => setPage(p => p + 1)}
              disabled={page * pageSize >= totalCount}
            >
              <ChevronUp className="h-3 w-3 mr-1" /> Ver eventos anteriores
            </Button>
          </div>
        )}
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-0.5 before:-translate-x-px before:bg-muted">
          {sortedEvents?.map((event) => (
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
          {(!sortedEvents || sortedEvents.length === 0) && (
            <p className="text-sm text-muted-foreground pl-8 italic text-center">Sem eventos encontrados.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


