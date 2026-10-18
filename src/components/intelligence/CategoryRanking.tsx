import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, LayoutGrid, TrendingUp, Store, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { useCategoryRanking, type CategoryRankingItem } from "@/hooks/useCommercialIntelligence";
import { cn } from "@/lib/utils";
import { IntelligenceEmptyState } from "./IntelligenceEmptyState";

type SortMode = "combined" | "internal" | "market";
type ViewMode = "list" | "chart";

interface CategoryPieDatum {
  fullName: string;
  value: number;
  internalRevenue: number;
  marketDepleted: number;
}

interface CategoryTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CategoryPieDatum }>;
  pieData: CategoryPieDatum[];
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  marketAvailable: boolean;
}

function CategoryTooltipContent({ active, payload, pieData, formatCurrency, formatNumber, marketAvailable }: CategoryTooltipProps) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  const total = pieData.reduce((sum, item) => sum + item.value, 0);
  const percent = total > 0 ? ((datum.value / total) * 100).toFixed(1) : '0';
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{datum.fullName}</p>
      <div className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-success" /><span>Interno: {formatCurrency(datum.internalRevenue)}</span></div>
      <CategoryMarketTooltipMetric marketAvailable={marketAvailable} marketDepleted={datum.marketDepleted} formatNumber={formatNumber} />
      <p className="text-muted-foreground">{percent}% do total</p>
    </div>
  );
}

function CategoryMarketTooltipMetric({
  marketAvailable,
  marketDepleted,
  formatNumber,
}: {
  marketAvailable: boolean;
  marketDepleted: number;
  formatNumber: (value: number) => string;
}) {
  if (!marketAvailable) return <p className="text-muted-foreground">Mercado: indisponível</p>;
  return <div className="flex items-center gap-1.5"><Store className="h-3 w-3 text-primary" /><span>Mercado: {formatNumber(marketDepleted)} un.</span></div>;
}

function CategoryMarketStatus({
  marketAvailable,
  isFetching,
  onRetry,
}: {
  marketAvailable: boolean;
  isFetching: boolean;
  onRetry: () => void;
}) {
  if (marketAvailable) return null;
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
      <div className="flex items-start gap-2 text-foreground">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <p>Dados de mercado indisponíveis. O ranking exibe somente a receita interna.</p>
      </div>
      <Button size="sm" variant="outline" disabled={isFetching} onClick={onRetry}>
        {isFetching ? "Tentando…" : "Tentar novamente"}
      </Button>
    </div>
  );
}

function CategoryMarketDetails({ marketAvailable, category, formatNumber }: {
  marketAvailable: boolean;
  category: CategoryRankingItem;
  formatNumber: (value: number) => string;
}) {
  if (!marketAvailable) return <p className="text-muted-foreground">Dados de mercado indisponíveis</p>;
  return (
    <>
      <div className="flex items-center gap-1.5">
        <Store className="h-3 w-3 text-primary" />
        <span>Mercado (saídas): {formatNumber(category.marketDepleted)} un.</span>
      </div>
      <p className="text-muted-foreground">Score: {category.totalScore.toFixed(1)}</p>
    </>
  );
}

function resolveCategorySortMode(marketAvailable: boolean, requestedMode: SortMode): SortMode {
  return marketAvailable ? requestedMode : "internal";
}

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(340, 82%, 52%)",
];

const MODE_LABELS: Record<SortMode, string> = {
  combined: "Combinado",
  internal: "Receita Interna",
  market: "Volume Mercado",
};

interface CategoryRankingProps {
  days?: number;
  categoryId?: string | null;
  supplierId?: string | null;
  productId?: string | null;
  categoryName?: string | null;
}

function CategoryRankingError({
  isError,
  hasData,
  isFetching,
  onRetry,
}: {
  isError: boolean;
  hasData: boolean;
  isFetching: boolean;
  onRetry: () => void;
}) {
  if (!isError) return null;
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <div className="flex items-start gap-2 text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{hasData ? "Falha ao atualizar o ranking. Os últimos dados carregados permanecem visíveis." : "Não foi possível carregar o ranking combinado de categorias."}</p>
      </div>
      <Button size="sm" variant="outline" disabled={isFetching} onClick={onRetry}>
        {isFetching ? "Tentando…" : "Tentar novamente"}
      </Button>
    </div>
  );
}

function CategoryRankingHeader({
  days,
  categoryName,
  sortMode,
  viewMode,
  onSortModeChange,
  onToggleView,
  marketAvailable,
}: {
  days: number;
  categoryName?: string | null;
  sortMode: SortMode;
  viewMode: ViewMode;
  onSortModeChange: (mode: SortMode) => void;
  onToggleView: () => void;
  marketAvailable: boolean;
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg skin-icon flex items-center justify-center"><LayoutGrid className="h-3.5 w-3.5" /></div>
            🏆 Ranking de Categorias
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {categoryName ? `Sub-categorias de "${categoryName}"` : 'Categorias mais vendidas'} · {MODE_LABELS[sortMode].toLowerCase()} · {days} dias
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label={viewMode === "list" ? "Exibir ranking em gráfico" : "Exibir ranking em lista"} className="h-7 w-7" onClick={onToggleView} title={viewMode === "list" ? "Ver gráfico" : "Ver lista"}>
            {viewMode === "list" ? <PieChartIcon className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
          </Button>
          <ToggleGroup
            type="single"
            value={sortMode}
            onValueChange={(value) => value && onSortModeChange(value as SortMode)}
            className="bg-muted/50 rounded-lg p-0.5"
          >
            <ToggleGroupItem value="combined" disabled={!marketAvailable} className="text-[10px] px-2 py-1 h-6 data-[state=on]:bg-background data-[state=on]:shadow-sm">Combinado</ToggleGroupItem>
            <ToggleGroupItem value="internal" className="text-[10px] px-2 py-1 h-6 data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1"><TrendingUp className="h-2.5 w-2.5" />Interno</ToggleGroupItem>
            <ToggleGroupItem value="market" disabled={!marketAvailable} className="text-[10px] px-2 py-1 h-6 data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1"><Store className="h-2.5 w-2.5" />Mercado</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </CardHeader>
  );
}

function CategoryRankingUnavailable({
  categoryName,
  isFetching,
  onRetry,
}: {
  categoryName?: string | null;
  isFetching: boolean;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" />Ranking de Categorias</CardTitle>
        <CardDescription>{categoryName ? `Sub-categorias de "${categoryName}"` : "Dados de vendas e mercado necessários para calcular o score combinado."}</CardDescription>
      </CardHeader>
      <CardContent><CategoryRankingError isError hasData={false} isFetching={isFetching} onRetry={onRetry} /></CardContent>
    </Card>
  );
}

function getCategoryRankingBlockingState({
  isLoading,
  isError,
  hasRanking,
  categoryName,
  isFetching,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  hasRanking: boolean;
  categoryName?: string | null;
  isFetching: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-56" /></CardHeader>
        <CardContent className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
        </CardContent>
      </Card>
    );
  }
  if (isError && !hasRanking) {
    return <CategoryRankingUnavailable categoryName={categoryName} isFetching={isFetching} onRetry={onRetry} />;
  }
  return null;
}

export function CategoryRanking({ days = 30, categoryId, supplierId, productId, categoryName }: CategoryRankingProps) {
  const [sortMode, setSortMode] = useState<SortMode>("combined");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const { data: ranking, isLoading, isError, isFetching, refetch } = useCategoryRanking(days, categoryId, supplierId, productId);
  const categories = ranking?.items;
  const marketAvailable = ranking?.marketAvailable ?? true;
  const effectiveSortMode = resolveCategorySortMode(marketAvailable, sortMode);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  const formatNumber = (v: number) =>
    new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v);

  const sortedCategories = useMemo(() => {
    if (!categories?.length) return [];
    const sorted = [...categories];
    switch (effectiveSortMode) {
      case "internal":
        return sorted.sort((a, b) => b.internalRevenue - a.internalRevenue);
      case "market":
        return sorted.sort((a, b) => b.marketDepleted - a.marketDepleted);
      default:
        return sorted.sort((a, b) => b.totalScore - a.totalScore);
    }
  }, [categories, effectiveSortMode]);

  const getBarValue = useCallback((cat: CategoryRankingItem): number => {
    switch (effectiveSortMode) {
      case "internal": return cat.internalRevenue;
      case "market": return cat.marketDepleted;
      default: return cat.totalScore;
    }
  }, [effectiveSortMode]);

  const getDisplayValue = (cat: CategoryRankingItem): string => {
    switch (effectiveSortMode) {
      case "internal": return formatCurrency(cat.internalRevenue);
      case "market": return `${formatNumber(cat.marketDepleted)} un.`;
      default: return formatCurrency(cat.internalRevenue);
    }
  };

  const pieData = useMemo(() => {
    if (!sortedCategories.length) return [];
    const top = sortedCategories.slice(0, 8);
    const rest = sortedCategories.slice(8);
    const restValue = rest.reduce((s, c) => s + getBarValue(c), 0);

    const items = top.map((cat, i) => ({
      name: cat.categoryName.length > 18 ? cat.categoryName.substring(0, 18) + '…' : cat.categoryName,
      fullName: cat.categoryName,
      value: getBarValue(cat),
      internalRevenue: cat.internalRevenue,
      marketDepleted: cat.marketDepleted,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));

    if (restValue > 0) {
      items.push({
        name: 'Outras',
        fullName: `Outras (${rest.length} categorias)`,
        value: restValue,
        internalRevenue: rest.reduce((s, c) => s + c.internalRevenue, 0),
        marketDepleted: rest.reduce((s, c) => s + c.marketDepleted, 0),
        fill: 'hsl(var(--muted-foreground))',
      });
    }

    return items;
  }, [getBarValue, sortedCategories]);

  const blockingState = getCategoryRankingBlockingState({
    isLoading,
    isError,
    hasRanking: Boolean(ranking),
    categoryName,
    isFetching,
    onRetry: () => void refetch(),
  });
  if (blockingState) return blockingState;

  const hasData = sortedCategories.length > 0;
  const maxVal = hasData ? Math.max(...sortedCategories.map(getBarValue)) : 0;

  // Use opacity-based approach so bars follow the skin
  const getBarOpacity = (i: number) => Math.max(1 - i * 0.06, 0.35);

  const medalEmojis = ['🥇', '🥈', '🥉'];

  return (
    <Card>
      <CategoryRankingHeader days={days} categoryName={categoryName} sortMode={effectiveSortMode} viewMode={viewMode} onSortModeChange={setSortMode} onToggleView={() => setViewMode((view) => view === "list" ? "chart" : "list")} marketAvailable={marketAvailable} />
      <CardContent>
        <CategoryRankingError isError={isError} hasData={Boolean(ranking)} isFetching={isFetching} onRetry={() => void refetch()} />
        <CategoryMarketStatus marketAvailable={marketAvailable} isFetching={isFetching} onRetry={() => void refetch()} />
        {!hasData ? (
          <IntelligenceEmptyState
            title="Nenhuma categoria com vendas"
            description={categoryName ? `Não há sub-categorias com movimentação em "${categoryName}".` : "Selecione um período mais amplo ou outros filtros."}
          />
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === "chart" ? (
              <motion.div
                key="chart"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="w-full h-[320px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={1}
                      stroke="hsl(var(--background))"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CategoryTooltipContent pieData={pieData} formatCurrency={formatCurrency} formatNumber={formatNumber} marketAvailable={marketAvailable} />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-[10px] text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-2.5"
              >
                <TooltipProvider delayDuration={200}>
                  {sortedCategories.map((cat, i) => {
                    const val = getBarValue(cat);
                    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                    return (
                      <Tooltip key={cat.categoryId}>
                        <TooltipTrigger asChild>
                          <div className="space-y-1 cursor-default">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 truncate flex-1 mr-2">
                                <span className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                  i < 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                  {i < 3 ? medalEmojis[i] : i + 1}
                                </span>
                                <span className="font-medium truncate text-xs">{cat.categoryName}</span>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2">
                                {effectiveSortMode !== "market" && cat.marketDepleted > 0 && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5">
                                    <Store className="h-2.5 w-2.5" />
                                    {formatNumber(cat.marketDepleted)}
                                  </Badge>
                                )}
                                <span className="text-xs font-semibold text-foreground">{getDisplayValue(cat)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    background: `hsl(var(--primary) / ${getBarOpacity(i)})`,
                                  }}
                                />
                              </div>
                              <span className="text-[9px] text-muted-foreground shrink-0 w-24 text-right">
                                {formatNumber(cat.internalQty)} un. · {cat.internalOrders} ped.
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs space-y-1">
                          <p className="font-semibold">{cat.categoryName}</p>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3 text-success" />
                            <span>Interno: {formatCurrency(cat.internalRevenue)} ({formatNumber(cat.internalQty)} un.)</span>
                          </div>
                          <CategoryMarketDetails marketAvailable={marketAvailable} category={cat} formatNumber={formatNumber} />
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
