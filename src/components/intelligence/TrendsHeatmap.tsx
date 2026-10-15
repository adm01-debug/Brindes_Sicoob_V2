/**
 * TrendsHeatmap — matriz 7 (dias) × 24 (horas) de atividade.
 * Mostra quando os clientes mais buscam/visualizam.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrendsHeatmapData } from "@/pages/trends/trends-projections";

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface TrendsHeatmapProps {
  days: number;
  data?: TrendsHeatmapData;
  isLoading?: boolean;
  isError?: boolean;
  isFetching?: boolean;
  onRetry?: () => void;
}

function HeatmapError({ hasData, isFetching, onRetry }: {
  hasData: boolean;
  isFetching: boolean;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <span>{hasData ? "Não foi possível atualizar o mapa. Os dados anteriores continuam exibidos." : "Não foi possível carregar os dados do mapa de calor."}</span>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>{isFetching ? "Tentando…" : "Tentar novamente"}</Button>}
    </div>
  );
}

function HeatmapGrid({ data }: { data: TrendsHeatmapData }) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-px text-[9px] text-muted-foreground pl-9">
          {Array.from({ length: 24 }).map((_, hour) => <div key={hour} className="w-5 text-center">{hour % 3 === 0 ? hour : ""}</div>)}
        </div>
        {data.matrix.map((row, day) => (
          <div key={day} className="flex gap-px items-center mt-px">
            <div className="w-9 text-[10px] text-muted-foreground font-medium">{DAYS_PT[day]}</div>
            {row.map((count, hour) => (
              <div
                key={hour}
                className={cn("w-5 h-5 rounded-sm transition-transform hover:scale-125 cursor-help", count === 0 && "bg-muted/40")}
                style={count > 0 ? { backgroundColor: `hsl(var(--primary) / ${0.15 + (count / data.max) * 0.85})` } : undefined}
                title={`${DAYS_PT[day]} ${hour}h — ${count} eventos`}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground pl-9">
          <span>menos</span>
          {[0.15, 0.35, 0.55, 0.75, 1].map((intensity) => <div key={intensity} className="w-4 h-3 rounded-sm" style={{ backgroundColor: `hsl(var(--primary) / ${intensity})` }} />)}
          <span>mais</span>
        </div>
      </div>
    </div>
  );
}

function HeatmapBody({ data, isLoading, isUnavailable }: { data?: TrendsHeatmapData; isLoading: boolean; isUnavailable: boolean }) {
  if (isLoading) return <Skeleton className="h-[260px] w-full" />;
  if (isUnavailable) return null;
  if (!data || data.max === 0) return <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes para o mapa de calor</div>;
  return <HeatmapGrid data={data} />;
}

export function TrendsHeatmap({ days, data, isLoading = false, isError = false, isFetching = false, onRetry }: TrendsHeatmapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-chart-3" />
          Mapa de Calor — Quando seus clientes estão ativos
        </CardTitle>
        <CardDescription>
          Eventos por dia da semana × hora (visualizações + buscas) nos últimos {days} dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && <HeatmapError hasData={Boolean(data)} isFetching={isFetching} onRetry={onRetry} />}
        <HeatmapBody data={data} isLoading={isLoading} isUnavailable={isError && !data} />
      </CardContent>
    </Card>
  );
}
