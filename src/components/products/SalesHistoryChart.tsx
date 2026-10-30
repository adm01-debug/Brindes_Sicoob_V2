import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  ComposedChart,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ShoppingCart,
  FileText,
  Users,
  DollarSign,
  Target,
  Loader2,
  Crown,
  RefreshCw,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useSalesHistory, type DailySalesPoint, type SellerRanking } from "@/hooks/useSalesHistory";
import { safeParseDateForChart } from "@/lib/stock-chart-utils";
import { KpiCard } from "@/components/ui/KpiCard";
import { useProductInsights } from "@/hooks/useProductRecommendations";


interface SalesHistoryChartProps {
  productId: string;
  productSku?: string;
  productName?: string;
}

type SalesChartDatum = DailySalesPoint & { dateFormatted: string; fullDate: string };

interface SalesTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SalesChartDatum }>;
}

const EMPTY_KPIS = { totalQuotedQty: 0, totalOrderedQty: 0, totalQuotedValue: 0, totalOrderedValue: 0, conversionRate: 0, uniqueSellers: 0, avgOrderValue: 0, topSellers: [] as SellerRanking[] };

function buildChartData(daily?: DailySalesPoint[]): SalesChartDatum[] {
  if (!daily?.length) return [];
  return daily.reduce<SalesChartDatum[]>((result, point) => {
    const parsed = safeParseDateForChart(point.date);
    if (parsed) result.push({ ...point, ...parsed });
    return result;
  }, []);
}

function LoadingCard() {
  return <Card><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;
}

function StatusCard({ error, retry }: { error: boolean; retry: () => void }) {
  return <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Vendas Internas</CardTitle></CardHeader><CardContent>{error ? <div className="flex flex-col items-center justify-center py-6 gap-2 text-center"><ShoppingCart className="h-6 w-6 text-destructive" /><p className="text-sm font-medium text-destructive">Erro ao carregar dados de vendas</p><p className="text-xs text-muted-foreground">Tente novamente em alguns instantes</p><Button variant="outline" size="sm" onClick={retry} className="gap-1.5 mt-1"><RefreshCw className="h-3.5 w-3.5" />Tentar novamente</Button></div> : <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado de vendas disponível ainda. Os dados serão exibidos quando houver orçamentos e pedidos.</p>}</CardContent></Card>;
}

function ChartHeader({ days, conversionRate }: { days: number; conversionRate: number }) {
  const conversionTone = conversionRate >= 40 ? 'bg-primary/15 text-primary border-primary/30' : conversionRate >= 20 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-destructive/15 text-destructive border-destructive/30';
  return <CardHeader className="pb-3"><div className="flex items-center justify-between flex-wrap gap-2"><div><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Vendas Internas</CardTitle><CardDescription className="mt-1">Orçamentos vs Pedidos · {days} dias</CardDescription></div>{conversionRate > 0 && <Badge variant="outline" className={cn("font-bold text-xs", conversionTone)}><Target className="h-3 w-3 mr-1" />{conversionRate.toFixed(1)}% conversão</Badge>}</div></CardHeader>;
}

function SalesKpis({ kpis, insights }: { kpis: typeof EMPTY_KPIS; insights: ReturnType<typeof useProductInsights>["data"] }) {
  const average = Number.isFinite(kpis.avgOrderValue) ? kpis.avgOrderValue : 0;
  const segments = insights?.topSegments ?? [];
  return <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" role="group" aria-label="Métricas de vendas internas"><KpiCard icon={FileText} label="Orçado (qtd)" value={kpis.totalQuotedQty.toLocaleString('pt-BR')} sub={formatCurrency(kpis.totalQuotedValue)} /><KpiCard icon={ShoppingCart} label="Vendido (qtd)" value={kpis.totalOrderedQty.toLocaleString('pt-BR')} sub={formatCurrency(kpis.totalOrderedValue)} highlight /><KpiCard icon={DollarSign} label="Ticket médio" value={formatCurrency(average)} sub="por pedido" /><KpiCard icon={Users} label="Vendedores" value={String(kpis.uniqueSellers)} sub="ativos" /><KpiCard icon={Package} label="Qtd. Média / Pedido" value={String(insights?.averageQuantity || 0)} sub="un." /><KpiCard icon={Users} label="Segmentos" value={String(segments.length)} sub={segments.length ? segments.slice(0, 2).map((segment) => segment.segment).join(', ') : 'Nenhum ainda'} /></div>;
}

function SalesChart({ data }: { data: SalesChartDatum[] }) {
  return <div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="dateFormatted" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" /><YAxis yAxisId="qty" tick={{ fontSize: 10 }} className="fill-muted-foreground" width={45} /><YAxis yAxisId="value" orientation="right" tick={{ fontSize: 10 }} className="fill-muted-foreground" width={35} hide /><Tooltip content={<SalesTooltip />} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} iconSize={8} formatter={(value: string) => <span className="text-muted-foreground text-[10px]">{value}</span>} /><Bar yAxisId="qty" dataKey="quotedQty" fill="hsl(var(--primary) / 0.25)" name="Qtd Orçada" radius={[2, 2, 0, 0]} barSize={6} /><Bar yAxisId="qty" dataKey="orderedQty" fill="hsl(var(--primary))" name="Qtd Vendida" radius={[2, 2, 0, 0]} barSize={6} /><Area yAxisId="value" type="monotone" dataKey="orderedValue" stroke="hsl(var(--chart-2, 142 71% 45%))" fill="hsl(var(--chart-2, 142 71% 45%) / 0.1)" strokeWidth={1.5} name="Faturamento" dot={false} /></ComposedChart></ResponsiveContainer></div>;
}

function TopSellers({ sellers }: { sellers: SellerRanking[] }) {
  if (sellers.length === 0) return null;
  return <div className="space-y-1.5"><p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Crown className="h-3 w-3" /> Top Vendedores</p><div className="space-y-1">{sellers.map((seller, index) => <SellerRow key={seller.sellerId} seller={seller} rank={index + 1} />)}</div></div>;
}

export function SalesHistoryChart({ productId, productSku }: SalesHistoryChartProps) {
  const [period, setPeriod] = useState<string>('30');
  const days = Number(period);

  const { data, isLoading, error, refetch } = useSalesHistory(productId, days);
  const { data: insights } = useProductInsights(productId, productSku);

  const hasData = Boolean(data?.daily?.length);
  const chartData = useMemo(() => buildChartData(data?.daily), [data?.daily]);
  const kpis = hasData ? data?.kpis ?? EMPTY_KPIS : EMPTY_KPIS;
  if (isLoading) return <LoadingCard />;
  if (!hasData) return <StatusCard error={Boolean(error)} retry={() => { void refetch(); }} />;

  return (
    <Card>
      <ChartHeader days={days} conversionRate={kpis.conversionRate} />
      <CardContent className="space-y-4">
        <SalesKpis kpis={kpis} insights={insights} />
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="h-7 flex-wrap">
            {['15','30','60','90','120','180','360'].map(p => (
              <TabsTrigger key={p} value={p} className="text-xs px-2 h-5">{p}d</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <SalesChart data={chartData} />
        <TopSellers sellers={kpis.topSellers} />
      </CardContent>
    </Card>
  );
}

// ---------- Sub-components ----------

// #1 fix: safe initials extraction — guards against empty sellerName
function SellerRow({ seller, rank }: { seller: SellerRanking; rank: number }) {
  const name = seller.sellerName || 'Vendedor';
  const initials = name
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '??';

  return (
    <div className="flex items-center gap-2 text-xs p-1.5 rounded-md hover:bg-muted/50 transition-colors">
      <span className={cn(
        "w-4 text-center font-bold",
        rank === 1 ? "text-warning" : "text-muted-foreground"
      )}>
        {rank}
      </span>
      <Avatar className="h-5 w-5">
        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <span className="font-medium text-foreground flex-1 truncate">{name}</span>
      <span className="text-muted-foreground">{seller.totalQty} un</span>
      <span className="font-semibold text-foreground">{formatCurrency(seller.totalValue)}</span>
      <div className="flex gap-1">
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
          {seller.quoteCount} orç
        </Badge>
        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
          {seller.orderCount} ped
        </Badge>
      </div>
    </div>
  );
}

// #2 fix: SalesTooltip shows fallback when all values are zero
function SalesTooltip({ active, payload }: SalesTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const activities = [
    { label: 'Orçado:', value: data.quotedQty, detail: `${data.quotedQty} un · ${formatCurrency(data.quotedValue)}`, emphasis: false },
    { label: 'Vendido:', value: data.orderedQty, detail: `${data.orderedQty} un · ${formatCurrency(data.orderedValue)}`, emphasis: true },
    { label: 'Orçamentos:', value: data.quoteCount, detail: String(data.quoteCount), emphasis: false },
    { label: 'Pedidos:', value: data.orderCount, detail: String(data.orderCount), emphasis: false },
  ].filter((activity) => activity.value > 0);

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-2 space-y-1.5">
        {activities.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Sem movimentação neste dia</p>
        )}
        {activities.map((activity) => (
          <div key={activity.label} className="flex justify-between text-xs text-muted-foreground">
            <span className={cn(activity.emphasis && "text-primary")}>{activity.label}</span>
            <span className={cn("font-semibold", activity.emphasis && "text-primary")}>{activity.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
