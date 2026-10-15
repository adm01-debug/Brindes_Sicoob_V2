/**
 * ConversionFunnel — Funil visual Search → View → Quote → Order.
 * Mostra drop-off entre cada estágio.
 */
import { useQuery } from "@tanstack/react-query";
import { isDemoMode } from "@/pages/trends/is-demo-mode";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Filter, Search, Eye, FileText, ShoppingBag, ArrowDown } from "lucide-react";
import { subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { applySellerScope, shouldShortCircuitForSelf } from "@/lib/auth/apply-seller-scope";
import { useSalesScope, type SalesScope } from "@/lib/auth/visibility-scope";

interface ConversionFunnelProps {
  days: number;
}

interface FunnelStage {
  key: string;
  label: string;
  icon: typeof Search;
  count: number;
  bgClass: string;     // estático para Tailwind JIT
  bgSoftClass: string;
  iconClass: string;
}

// Mapa estático de cores (evita purge JIT)
const STAGE_STYLES = {
  searches: {
    bgClass: "bg-chart-2/15",
    bgSoftClass: "bg-chart-2/30",
    iconClass: "text-chart-2",
  },
  views: {
    bgClass: "bg-primary/15",
    bgSoftClass: "bg-primary/30",
    iconClass: "text-primary",
  },
  quotes: {
    bgClass: "bg-chart-3/15",
    bgSoftClass: "bg-chart-3/30",
    iconClass: "text-chart-3",
  },
  orders: {
    bgClass: "bg-success/15",
    bgSoftClass: "bg-success/30",
    iconClass: "text-success",
  },
} as const;

interface CountQueryResult {
  count: number | null;
  error?: unknown;
}

interface AnalyticsClient {
  from: (table: string) => {
    select: (columns: string, options: { count: "exact"; head: true }) => {
      gte: (column: string, value: string) => PromiseLike<CountQueryResult>;
    };
  };
}

async function fetchFunnel(since: string, scope: SalesScope, userId: string | null | undefined) {
  if (isDemoMode()) {
    const { MOCK_FUNNEL } = await import("@/pages/trends/trends-mock");
    return { searches: 3_421, views: MOCK_FUNNEL.views, quotes: MOCK_FUNNEL.quotes, orders: MOCK_FUNNEL.orders };
  }
  if (shouldShortCircuitForSelf(scope, userId)) return { searches: 0, views: 0, quotes: 0, orders: 0 };
  const analytics = supabase as unknown as AnalyticsClient;
  const quotesQuery = applySellerScope(supabase.from("quotes").select("id", { count: "exact", head: true }), { scope, userId });
  const ordersQuery = applySellerScope(supabase.from("orders").select("id", { count: "exact", head: true }), { scope, userId });
  const [searches, views, quotes, orders] = await Promise.all([
    analytics.from("search_analytics").select("id", { count: "exact", head: true }).gte("created_at", since),
    analytics.from("product_views").select("id", { count: "exact", head: true }).gte("created_at", since),
    quotesQuery.gte("created_at", since),
    ordersQuery.gte("created_at", since),
  ]);
  const failedQuery = [searches, views, quotes, orders].find((result) => result.error);
  if (failedQuery?.error) throw failedQuery.error;

  return { searches: searches.count ?? 0, views: views.count ?? 0, quotes: quotes.count ?? 0, orders: orders.count ?? 0 };
}

function useConversionData(days: number) {
  const { user } = useAuth();
  const scope = useSalesScope();
  const since = subDays(new Date(), days).toISOString();
  const demo = isDemoMode();
  return useQuery({
    queryKey: ["conversion-funnel", days, scope, user?.id, demo],
    queryFn: () => fetchFunnel(since, scope, user?.id),
    staleTime: 1000 * 60 * 5,
  });
}

type FunnelData = Awaited<ReturnType<typeof fetchFunnel>>;

function buildStages(data?: FunnelData): FunnelStage[] {
  return [
    { key: "searches", label: "Buscas", icon: Search, count: data?.searches ?? 0, ...STAGE_STYLES.searches },
    { key: "views", label: "Visualizações", icon: Eye, count: data?.views ?? 0, ...STAGE_STYLES.views },
    { key: "quotes", label: "Orçamentos", icon: FileText, count: data?.quotes ?? 0, ...STAGE_STYLES.quotes },
    { key: "orders", label: "Pedidos", icon: ShoppingBag, count: data?.orders ?? 0, ...STAGE_STYLES.orders },
  ];
}

function StageTransition({ previousCount, count }: { previousCount: number | null; count: number }) {
  if (previousCount === null) return null;
  const conversionRate = previousCount > 0 ? Math.round((count / previousCount) * 100) : null;
  const dropoff = previousCount > 0 ? Math.round(((previousCount - count) / previousCount) * 100) : null;
  return <div className="flex items-center gap-2 ml-2 my-1 text-[10px] text-muted-foreground"><ArrowDown className="h-3 w-3" /><span>{conversionRate !== null ? `${conversionRate}% conversão` : "—"}</span>{dropoff !== null && dropoff > 0 && <span className="text-destructive/70">· -{dropoff}% drop-off</span>}</div>;
}

function StageRow({ stage, previousCount, maxCount }: { stage: FunnelStage; previousCount: number | null; maxCount: number }) {
  const widthPercent = Math.max((stage.count / maxCount) * 100, 8);
  const Icon = stage.icon;
  return <div><StageTransition previousCount={previousCount} count={stage.count} /><div className={`h-12 rounded-lg flex items-center px-3 transition-all ${stage.bgClass}`} style={{ width: `${widthPercent}%`, minWidth: "180px" }}><div className={`p-1.5 rounded-md mr-3 ${stage.bgSoftClass}`}><Icon className={`h-4 w-4 ${stage.iconClass}`} /></div><div className="flex-1"><p className="text-xs font-medium leading-none">{stage.label}</p><p className="text-base font-bold leading-tight mt-0.5">{stage.count.toLocaleString("pt-BR")}</p></div></div></div>;
}

function FunnelRows({ stages }: { stages: FunnelStage[] }) {
  const maxCount = Math.max(...stages.map((stage) => stage.count), 1);
  return <div className="space-y-2">{stages.map((stage, index) => <StageRow key={stage.key} stage={stage} previousCount={index > 0 ? stages[index - 1]?.count ?? null : null} maxCount={maxCount} />)}</div>;
}

function LoadingRows() {
  return <div className="space-y-3">{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-12 w-full" />)}</div>;
}

function TotalConversion({ data, isLoading }: { data?: FunnelData; isLoading: boolean }) {
  if (isLoading || !data || data.searches <= 0) return null;
  return <div className="mt-4 pt-3 border-t border-border/50"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Conversão total (busca → pedido):</span><span className="font-bold text-success">{((data.orders / data.searches) * 100).toFixed(2)}%</span></div></div>;
}

export function ConversionFunnel({ days }: ConversionFunnelProps) {
  const { data, isLoading, isError, isFetching, refetch } = useConversionData(days);
  const stages = buildStages(data);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          Funil de Conversão
        </CardTitle>
        <CardDescription className="text-xs">
          Jornada do cliente nos últimos {days} dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{data ? "Falha ao atualizar o funil. Os últimos dados carregados permanecem visíveis." : "Não foi possível carregar os dados do funil."}</p>
            </div>
            <Button size="sm" variant="outline" disabled={isFetching} onClick={() => void refetch()}>
              {isFetching ? "Tentando…" : "Tentar novamente"}
            </Button>
          </div>
        )}
        {isLoading ? <LoadingRows /> : isError && !data ? null : <FunnelRows stages={stages} />}
        <TotalConversion data={data} isLoading={isLoading || (isError && !data)} />
      </CardContent>
    </Card>
  );
}
