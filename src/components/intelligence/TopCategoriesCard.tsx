/**
 * TopCategoriesCard — categorias em alta extraídas da tabela `product_views`
 * via prefixo de SKU/nome. Aplica trending score.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Layers, TrendingUp, Sparkles } from "lucide-react";
import type { CategoryTrend } from "@/pages/trends/trends-projections";

interface TopCategoriesCardProps {
  days: number;
  data?: CategoryTrend[];
  isLoading?: boolean;
  isError?: boolean;
  isFetching?: boolean;
  onRetry?: () => void;
}

function CategoriesError({ hasData, isFetching, onRetry }: {
  hasData: boolean;
  isFetching: boolean;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">
      <span>{hasData ? "Não foi possível atualizar o ranking. Os dados anteriores continuam exibidos." : "Não foi possível carregar o ranking de categorias."}</span>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry} disabled={isFetching}>{isFetching ? "Tentando…" : "Tentar novamente"}</Button>}
    </div>
  );
}

function CategoryTrendRow({ row, index }: { row: CategoryTrend; index: number }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-chart-4/15 text-chart-4 font-bold text-xs shrink-0">{index + 1}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm text-foreground truncate">{row.category}</p>
          {row.classification === 'rising' && Number.isFinite(row.growthPercent) && <Badge variant="outline" className="text-[9px] h-4 px-1 bg-success/10 text-success border-success/30 shrink-0"><TrendingUp className="h-2.5 w-2.5 mr-0.5" />+{Math.round(row.growthPercent)}%</Badge>}
          {row.classification === 'new' && <Badge variant="outline" className="text-[9px] h-4 px-1 bg-primary/10 text-primary border-primary/30 shrink-0"><Sparkles className="h-2.5 w-2.5 mr-0.5" />NOVO</Badge>}
        </div>
        <p className="text-[10px] text-muted-foreground">{row.recentViews} recentes · {row.baselineViews} baseline</p>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">{row.views}</Badge>
    </div>
  );
}

function CategoriesBody({ data, isLoading, isUnavailable }: { data?: CategoryTrend[]; isLoading: boolean; isUnavailable: boolean }) {
  if (isLoading) return <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (isUnavailable) return <div className="h-[160px] flex items-center justify-center text-muted-foreground"><AlertTriangle className="h-8 w-8 text-destructive/70" /></div>;
  if (!data?.length) return <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Ainda não há dados suficientes para ranquear categorias</div>;
  return <div className="space-y-2">{data.map((row, index) => <CategoryTrendRow key={row.category} row={row} index={index} />)}</div>;
}

export function TopCategoriesCard({ days, data, isLoading = false, isError = false, isFetching = false, onRetry }: TopCategoriesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-chart-4" />
          Categorias em Alta
        </CardTitle>
        <CardDescription>
          Ranqueado por crescimento (não só volume) nos últimos {days} dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && <CategoriesError hasData={Boolean(data)} isFetching={isFetching} onRetry={onRetry} />}
        <CategoriesBody data={data} isLoading={isLoading} isUnavailable={isError && !data} />
      </CardContent>
    </Card>
  );
}
