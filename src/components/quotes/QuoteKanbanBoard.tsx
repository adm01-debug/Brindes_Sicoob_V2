import { useMemo } from "react";
import { useQuotes } from "@/hooks/useQuotes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QUOTE_STATUS_CONFIG } from "@/lib/quote-status-config";
import { formatCurrency } from "@/utils/quote-calculations";
import { Clock, ArrowRight, User, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const KANBAN_STATUSES = ["pending_singular_approval", "sent", "approved", "rejected"];

/**
 * ApprovalKanbanBoard — Quadro Kanban para o Gestor da Singular visualizar o fluxo de aprovação.
 */
export function QuoteKanbanBoard() {
  const { quotes, isLoading } = useQuotes();
  const navigate = useNavigate();

  const columns = useMemo(() => {
    const map: Record<string, any[]> = {};
    KANBAN_STATUSES.forEach(s => map[s] = []);
    quotes.forEach(q => {
      if (KANBAN_STATUSES.includes(q.status)) {
        map[q.status].push(q);
      }
    });
    return map;
  }, [quotes]);

  if (isLoading) return <div className="h-96 flex items-center justify-center">Carregando quadro...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
      {KANBAN_STATUSES.map((status) => {
        const config = QUOTE_STATUS_CONFIG[status];
        const items = columns[status] || [];

        return (
          <div key={status} className="flex flex-col h-full bg-muted/20 rounded-2xl border border-border/40 overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-card/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn("w-2 h-2 rounded-full", config?.badgeClassName)} />
                  <h3 className="font-display font-bold text-sm truncate">{config?.label}</h3>
                </div>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">{items.length}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                Total: {formatCurrency(items.reduce((s, i) => s + (i.total || 0), 0))}
              </p>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="py-10 text-center opacity-40">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-[11px]">Sem itens</p>
                  </div>
                ) : (
                  items.map((quote) => (
                    <Card 
                      key={quote.id} 
                      className="group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 border-border/60 bg-card"
                      onClick={() => navigate(`/orcamentos/${quote.id}`)}
                    >
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">#{quote.quote_number}</p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">{quote.client_company || "Sem empresa"}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 tabular-nums">
                            {formatCurrency(quote.total || 0)}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate">Vendedor</span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
