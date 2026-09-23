/**
 * OrdersHeatmap — matriz 7 (dias) × 24 (horas) de atividade de PEDIDOS.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";
import { cn } from "@/lib/utils";

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function OrdersHeatmap() {
  const days = 90; // Período maior para heatmap de pedidos
  const since = subDays(new Date(), days).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["orders-heatmap", days],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("created_at")
        .gte("created_at", since);

      const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      orders?.forEach(r => {
        const d = new Date(r.created_at);
        const row = matrix[d.getDay()]!;
        row[d.getHours()] = (row[d.getHours()] ?? 0) + 1;
      });
      
      const flat = matrix.flat();
      const max = Math.max(...flat, 1);
      return { matrix, max };
    },
  });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Activity className="h-5 w-5 text-primary" />
          Mapa de Calor de Pedidos
        </CardTitle>
        <CardDescription className="text-xs">
          Concentração de pedidos por dia da semana × hora (últimos {days} dias)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : !data || data.max === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Sem dados suficientes para o mapa de calor de pedidos
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="inline-block min-w-full">
              {/* Header: horas */}
              <div className="flex gap-px text-[9px] text-muted-foreground pl-9 mb-1">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="w-5 text-center">
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {data.matrix.map((row, day) => (
                <div key={day} className="flex gap-px items-center mt-px">
                  <div className="w-9 text-[10px] text-muted-foreground font-bold">
                    {DAYS_PT[day]}
                  </div>
                  {row.map((count, hour) => {
                    const intensity = count / data.max;
                    return (
                      <div
                        key={hour}
                        className={cn(
                          "w-5 h-5 rounded-sm transition-transform hover:scale-125 cursor-help",
                          count === 0 && "bg-muted/30",
                        )}
                        style={
                          count > 0
                            ? {
                                backgroundColor: `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
                              }
                            : undefined
                        }
                        title={`${DAYS_PT[day]} ${hour}h — ${count} pedidos`}
                      />
                    );
                  })}
                </div>
              ))}
              {/* Legenda */}
              <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground pl-9">
                <span className="font-medium">menor volume</span>
                {[0.15, 0.35, 0.55, 0.75, 1].map((i) => (
                  <div
                    key={i}
                    className="w-4 h-2.5 rounded-sm"
                    style={{ backgroundColor: `hsl(var(--primary) / ${i})` }}
                  />
                ))}
                <span className="font-medium">maior volume</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
