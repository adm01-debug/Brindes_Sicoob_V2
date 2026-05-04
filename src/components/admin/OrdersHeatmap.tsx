import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function OrdersHeatmap() {
  const { data: heatmapData } = useQuery({
    queryKey: ["admin_orders_heatmap"],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
      
      orders?.forEach(order => {
        const date = new Date(order.created_at);
        const day = date.getDay();
        const hour = date.getHours();
        matrix[day][hour]++;
      });

      return matrix;
    }
  });

  if (!heatmapData) return null;

  const maxVal = Math.max(1, ...heatmapData.flat());

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Clock className="h-3 w-3" /> Heatmap de Pedidos (30 dias)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <TooltipProvider>
          <div className="flex flex-col gap-[2px]">
            <div className="flex gap-[2px] ml-6 mb-1">
              {[0, 6, 12, 18, 23].map(h => (
                <span key={h} className="text-[8px] text-muted-foreground w-[10px] text-center" style={{ marginLeft: h === 0 ? 0 : `${(h * 12) - (idx_prev * 12)}px` }}>
                  {h}h
                </span>
              ))}
            </div>
            {heatmapData.map((dayRow, dayIdx) => (
              <div key={dayIdx} className="flex gap-[2px] items-center">
                <span className="text-[9px] text-muted-foreground w-6 font-medium">{DAYS[dayIdx]}</span>
                <div className="flex gap-[1px]">
                  {dayRow.map((count, hourIdx) => {
                    const intensity = count / maxVal;
                    return (
                      <Tooltip key={hourIdx}>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "w-[10px] h-[10px] rounded-[1px] transition-colors",
                              count === 0 ? "bg-muted/30" : 
                              intensity < 0.3 ? "bg-primary/20" :
                              intensity < 0.6 ? "bg-primary/50" :
                              "bg-primary"
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] p-2">
                          {DAYS[dayIdx]}, {hourIdx}h: {count} pedido{count !== 1 ? 's' : ''}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

const idx_prev = 0; // Simplified for the inline calculation fix
