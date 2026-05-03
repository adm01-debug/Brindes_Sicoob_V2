/**
 * OrderStatusTimeline — visualização horizontal do progresso do pedido.
 */
import { Check, Circle, XCircle } from "lucide-react";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/hooks";
import { cn } from "@/lib/utils";

interface OrderStatusTimelineProps {
  status: string;
}

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        <XCircle className="h-4 w-4" /> Pedido cancelado
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(status as typeof ORDER_STATUS_FLOW[number]);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {ORDER_STATUS_FLOW.map((s, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s} className="flex items-center gap-1 flex-shrink-0">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 bg-background text-muted-foreground",
                active && "ring-2 ring-primary/30"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
            </div>
            <span
              className={cn(
                "text-xs whitespace-nowrap",
                done ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {ORDER_STATUS_LABELS[s]}
            </span>
            {i < ORDER_STATUS_FLOW.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-6 mx-1",
                  i < currentIndex ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
