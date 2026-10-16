/**
 * TopProductFamiliesCard — famílias de produtos em alta extraídas de `product_views`.
 * A família é uma aproximação pelo primeiro termo do nome do produto.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Layers, TrendingUp, Sparkles } from 'lucide-react';
import type { ProductFamilyTrend } from '@/pages/trends/trends-projections';

interface TopProductFamiliesCardProps {
  days: number;
  data?: ProductFamilyTrend[];
  isLoading?: boolean;
  isError?: boolean;
  isFetching?: boolean;
  onRetry?: () => void;
}

function ProductFamiliesError({
  hasData,
  isFetching,
  onRetry,
}: {
  hasData: boolean;
  isFetching: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground"
    >
      <span>
        {hasData
          ? 'Não foi possível atualizar o ranking. Os dados anteriores continuam exibidos.'
          : 'Não foi possível carregar o ranking de famílias de produtos.'}
      </span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} disabled={isFetching}>
          {isFetching ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      )}
    </div>
  );
}

function ProductFamilyTrendRow({ row, index }: { row: ProductFamilyTrend; index: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5 transition-colors hover:bg-muted/60">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chart-4/15 text-xs font-bold text-chart-4">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">{row.family}</p>
          {row.classification === 'rising' && Number.isFinite(row.growthPercent) && (
            <Badge
              variant="outline"
              className="h-4 shrink-0 border-success/30 bg-success/10 px-1 text-[9px] text-success"
            >
              <TrendingUp className="mr-0.5 h-2.5 w-2.5" />+{Math.round(row.growthPercent)}%
            </Badge>
          )}
          {row.classification === 'new' && (
            <Badge
              variant="outline"
              className="h-4 shrink-0 border-primary/30 bg-primary/10 px-1 text-[9px] text-primary"
            >
              <Sparkles className="mr-0.5 h-2.5 w-2.5" />
              NOVO
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {row.recentViews} recentes · {row.baselineViews} baseline
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs">
        {row.views}
      </Badge>
    </div>
  );
}

function ProductFamiliesBody({
  data,
  isLoading,
  isUnavailable,
}: {
  data?: ProductFamilyTrend[];
  isLoading: boolean;
  isUnavailable: boolean;
}) {
  if (isLoading)
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  if (isUnavailable)
    return (
      <div className="flex h-[160px] items-center justify-center text-muted-foreground">
        <AlertTriangle className="h-8 w-8 text-destructive/70" />
      </div>
    );
  if (!data?.length)
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        Ainda não há dados suficientes para ranquear famílias de produtos
      </div>
    );
  return (
    <div className="space-y-2">
      {data.map((row, index) => (
        <ProductFamilyTrendRow key={row.family} row={row} index={index} />
      ))}
    </div>
  );
}

export function TopProductFamiliesCard({
  days,
  data,
  isLoading = false,
  isError = false,
  isFetching = false,
  onRetry,
}: TopProductFamiliesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-chart-4" />
          Famílias de Produtos em Alta
        </CardTitle>
        <CardDescription>
          Agrupamento aproximado pelo primeiro termo do nome · crescimento nos últimos {days} dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <ProductFamiliesError hasData={Boolean(data)} isFetching={isFetching} onRetry={onRetry} />
        )}
        <ProductFamiliesBody data={data} isLoading={isLoading} isUnavailable={isError && !data} />
      </CardContent>
    </Card>
  );
}
