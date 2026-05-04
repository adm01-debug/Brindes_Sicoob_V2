/**
 * OrderStatusTimeline — visualização horizontal do progresso do pedido.
 */
import { Check, Circle, XCircle, Clock, Package, Truck, CheckCircle2, ShieldCheck, History, Info } from "lucide-react";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/hooks";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface OrderStatusTimelineProps {
  status: string;
  orderId?: string;
}

const statusIcons: Record<string, any> = {
  rascunho: Clock,
  enviado_gestor: ShieldCheck,
  aprovado_gestor: Package,
  em_producao: Package,
  enviado: Truck,
  concluido: CheckCircle2,
  cancelado: XCircle,
};

export function OrderStatusTimeline({ status, orderId }: OrderStatusTimelineProps) {
  const { data: approvalHistory } = useQuery({
    queryKey: ["order_approval_history_timeline", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("order_approval_history")
        .select(`
          *,
          approver:approver_id(full_name)
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orderId
  });

  const latestApproval = approvalHistory?.[0];
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <XCircle className="h-5 w-5" />
        <div className="flex flex-col">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Status do Pedido</span>
          <span className="font-medium text-base">Pedido Cancelado</span>
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(status as typeof ORDER_STATUS_FLOW[number]);

  return (
    <div className="w-full bg-card/50 backdrop-blur-sm rounded-xl border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Progresso do Pedido</span>
          <h3 className="font-bold text-lg text-foreground capitalize">
            {ORDER_STATUS_LABELS[status] || status.replace('_', ' ')}
          </h3>
        </div>
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          {(() => {
            const Icon = statusIcons[status] || Package;
            return <Icon className="h-5 w-5 text-primary" />;
          })()}
        </div>
      </div>

      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-muted hidden md:block">
          <div 
            className="h-full bg-primary transition-all duration-700 ease-in-out" 
            style={{ width: `${(currentIndex / (ORDER_STATUS_FLOW.length - 1)) * 100}%` }}
          />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-0">
          {ORDER_STATUS_FLOW.map((s, i) => {
            const isDone = i <= currentIndex;
            const isActive = i === currentIndex;
            const Icon = statusIcons[s] || Circle;
            const label = ORDER_STATUS_LABELS[s] || s;

            return (
              <div key={s} className="flex flex-row md:flex-col items-center gap-4 md:gap-3 z-10 group">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 shadow-sm",
                    isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 bg-background text-muted-foreground",
                    isActive && "ring-4 ring-primary/20 scale-110"
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                
                <div className="flex flex-col md:items-center">
                  <span
                    className={cn(
                      "text-xs font-semibold text-center transition-colors",
                      isDone ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-primary font-bold uppercase animate-pulse hidden md:block mt-1">
                      Atual
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
