/**
 * OrderCard — card de listagem de pedido (uso em OrdersPage).
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, User, ArrowRight, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, type OrderRow } from "@/hooks";
import { cn } from "@/lib/utils";

interface OrderCardProps {
  order: OrderRow;
  onClick?: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status.replace('_', ' ');
  const statusColorClass = ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground border-border";

  return (
    <Card
      data-testid="order-card"
      data-order-id={order.id}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300",
        "hover:shadow-md active:scale-[0.995] cursor-pointer"
      )}
    >
      {/* Visual Accent */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5",
        order.status === 'concluido' ? 'bg-emerald-500' : 
        order.status === 'cancelado' ? 'bg-destructive' : 
        'bg-primary'
      )} />

      <CardContent className="p-0">
        <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors border border-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Pedido</span>
                <p className="font-bold text-lg text-foreground truncate">#{order.order_number}</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(order.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                </div>
                {order.client_name && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[150px]">{order.client_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0 pt-4 sm:pt-0 border-t sm:border-0 border-border/50">
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", statusColorClass)}>
                {statusLabel}
              </Badge>
              {order.tracking_number && (
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {order.tracking_number}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Valor Total</p>
                <p className="font-bold text-lg text-foreground whitespace-nowrap">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total || 0)}
                </p>
              </div>
              
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 hidden md:flex">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
