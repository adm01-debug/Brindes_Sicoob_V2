/**
 * HotSearchesCard — Buscas Quentes.
 * Top termos buscados (com resultados) no período. Proxy de interesse real do mercado.
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Flame, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { HotSearchItem } from "@/pages/trends/trends-projections";

interface HotSearchesCardProps {
  days: number;
  data?: HotSearchItem[];
  totalSearches: number;
  isLoading?: boolean;
  isError?: boolean;
  isFetching?: boolean;
  onRetry?: () => void;
}

type Navigate = ReturnType<typeof useNavigate>;

function HotSearchesError({ hasData, isFetching, onRetry }: {
  hasData: boolean;
  isFetching: boolean;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="m-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
      <span>{hasData ? "Não foi possível atualizar as buscas quentes. Os dados anteriores continuam exibidos." : "Não foi possível carregar as buscas quentes."}</span>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry} disabled={isFetching}>{isFetching ? "Tentando…" : "Tentar novamente"}</Button>}
    </div>
  );
}

function HotSearchRow({ item, index, navigate }: { item: HotSearchItem; index: number; navigate: Navigate }) {
  const TrendIcon = item.delta > 5 ? TrendingUp : item.delta < -5 ? TrendingDown : Minus;
  const trendColor = item.delta > 5 ? "text-success" : item.delta < -5 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary/15 text-primary shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">"{item.term}"</p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          {item.searchCount} buscas
          <span className={`inline-flex items-center gap-0.5 ${trendColor}`}>· <TrendIcon className="h-2.5 w-2.5" />{item.delta > 0 ? "+" : ""}{item.delta}%</span>
        </p>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 shrink-0" onClick={() => navigate(`/filtros?search=${encodeURIComponent(item.term)}`)} aria-label={`Ver catálogo para ${item.term}`}>Ver</Button>
    </div>
  );
}

function HotSearchesBody({ data, isLoading, isUnavailable, navigate }: {
  data?: HotSearchItem[];
  isLoading: boolean;
  isUnavailable: boolean;
  navigate: Navigate;
}) {
  if (isLoading) return <div className="p-3 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  if (isUnavailable) return <div className="flex justify-center px-4 pb-8 text-muted-foreground"><AlertTriangle className="h-8 w-8 text-destructive/70" /></div>;
  if (!data?.length) return <div className="flex flex-col items-center py-10 text-muted-foreground"><Search className="h-8 w-8 mb-2 opacity-30" /><p className="text-xs">Sem dados de busca no período</p></div>;
  return <div className="divide-y divide-border">{data.map((item, index) => <HotSearchRow key={item.term} item={item} index={index} navigate={navigate} />)}</div>;
}

export function HotSearchesCard({
  days,
  data,
  totalSearches,
  isLoading = false,
  isError = false,
  isFetching = false,
  onRetry,
}: HotSearchesCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader className="pb-3 bg-primary/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <Flame className="h-3.5 w-3.5 text-primary" />
              </div>
              Buscas Quentes
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Top termos pesquisados · interesse real em {days} dias
            </CardDescription>
          </div>
          {totalSearches > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {totalSearches} buscas
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isError && <HotSearchesError hasData={Boolean(data)} isFetching={isFetching} onRetry={onRetry} />}
        <HotSearchesBody data={data} isLoading={isLoading} isUnavailable={isError && !data} navigate={navigate} />
      </CardContent>
    </Card>
  );
}
