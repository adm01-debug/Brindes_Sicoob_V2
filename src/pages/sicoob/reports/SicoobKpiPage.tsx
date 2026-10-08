import React, { useState } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { TrendingUp, Clock, Target, PackageCheck, Download, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ptBR } from 'date-fns/locale';
import { endOfDay, format, startOfDay, subMonths } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  deduplicateCompletedOrders,
  formatMeasuredCurrency,
} from '@/lib/sicoob/operationalMetrics';

const COLORS = ['#003641', '#7DB61C', '#9DB7C3', '#E3E829'];

interface KpiQueryInput {
  paId?: string | null;
  cooperativeId?: string | null;
  isDev: boolean;
  from?: Date;
  to?: Date;
}

async function loadKpiStats({ paId, cooperativeId, isDev, from, to }: KpiQueryInput) {
  const completionEvents = await loadCompletionEvents({ paId, cooperativeId, isDev, from, to });
  const orders = deduplicateCompletedOrders(
    completionEvents.map((event) => ({
      order_id: event.order_id,
      created_at: event.created_at,
      total_amount: event.order?.total_amount ?? null,
    })),
  );
  const orderIds = orders.map((order) => order.id);
  const { data: items, error: itemsError } =
    orderIds.length > 0
      ? await supabase
          .from('sicoob_order_items')
          .select('product_name, quantity')
          .in('order_id', orderIds)
      : { data: [], error: null };
  if (itemsError) throw itemsError;
  return buildKpiStats(orders, items || []);
}

async function loadCompletionEvents({ paId, cooperativeId, isDev, from, to }: KpiQueryInput) {
  let query = supabase
    .from('sicoob_order_history')
    .select(
      'order_id, created_at, order:sicoob_orders!inner(total_amount, status, pa_id, cooperative_id)',
    )
    .eq('new_status', 'completed')
    .eq('order.status', 'completed')
    .gte('created_at', startOfDay(from || subMonths(new Date(), 6)).toISOString())
    .lte('created_at', endOfDay(to || new Date()).toISOString());
  if (!isDev && paId) query = query.eq('order.pa_id', paId);
  else if (!isDev && cooperativeId) query = query.eq('order.cooperative_id', cooperativeId);
  const { data, error: completionError } = await query.order('created_at', { ascending: true });
  if (completionError) throw completionError;
  return data || [];
}

type CompletedOrder = ReturnType<typeof deduplicateCompletedOrders>[number];
type KpiItem = { product_name: string | null; quantity: number | null };

function buildMonthlyChart(orders: CompletedOrder[]) {
  const monthlyData: Record<string, { name: string; valor: number }> = {};
  orders.forEach((order) => {
    const completedAt = new Date(order.completed_at);
    const monthKey = format(completedAt, 'yyyy-MM');
    monthlyData[monthKey] ||= { name: format(completedAt, 'MMM/yy', { locale: ptBR }), valor: 0 };
    monthlyData[monthKey].valor += order.total_amount;
  });
  return Object.entries(monthlyData)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);
}

function buildProductMix(items: KpiItem[]) {
  const productTotals = items.reduce<Record<string, number>>((totals, item) => {
    const name = item.product_name?.trim() || 'Produto sem nome';
    totals[name] = (totals[name] || 0) + Number(item.quantity || 0);
    return totals;
  }, {});
  const rankedProducts = Object.entries(productTotals).sort(([, left], [, right]) => right - left);
  const productMix = rankedProducts.slice(0, 4).map(([name, value]) => ({ name, value }));
  const otherUnits = rankedProducts.slice(4).reduce((sum, [, value]) => sum + value, 0);
  if (otherUnits > 0) productMix.push({ name: 'Outros', value: otherUnits });
  return { productMix, totalUnits: rankedProducts.reduce((sum, [, value]) => sum + value, 0) };
}

function buildKpiStats(orders: CompletedOrder[], items: KpiItem[]) {
  const total = orders.reduce((acc, order) => acc + order.total_amount, 0);
  const count = orders.length;
  const avg = count > 0 ? total / count : 0;
  const { productMix, totalUnits } = buildProductMix(items);

  return {
    ticketMedio: avg,
    totalVolume: total,
    orderCount: count,
    totalUnits,
    chartData: buildMonthlyChart(orders),
    productMix,
    measuredAt: new Date().toISOString(),
  };
}

type KpiStats = Awaited<ReturnType<typeof loadKpiStats>>;

function getShortPeriodLabel(date?: DateRange) {
  if (!date?.from) return 'Selecionar período';
  if (!date.to) return format(date.from, 'dd/MM/yy');
  return `${format(date.from, 'dd/MM/yy')} - ${format(date.to, 'dd/MM/yy')}`;
}

function showWhenLoaded(isLoading: boolean, value: string | number) {
  return isLoading ? '—' : value;
}

function measuredCount(sampleSize: number, value: number) {
  return sampleSize > 0 ? value : 'Sem dados';
}

function getKpiContextMessage(error: Error | null, date: DateRange | undefined, stats?: KpiStats) {
  if (error)
    return 'Não foi possível calcular os indicadores deste período. Nenhum valor de fallback foi exibido.';
  const from = date?.from ? format(date.from, 'dd/MM/yyyy') : 'início não definido';
  const to = date?.to ? format(date.to, 'dd/MM/yyyy') : 'hoje';
  const measuredAt = stats?.measuredAt
    ? `; atualizado em ${format(new Date(stats.measuredAt), 'dd/MM/yyyy HH:mm')}`
    : '';
  return `Período: ${from} a ${to}. Amostra: ${stats?.orderCount ?? 0} pedido(s) concluído(s)${measuredAt}.`;
}

function useKpiStats(date: DateRange | undefined) {
  const { profile, isDev } = useAuth();
  return useQuery({
    queryKey: ['sicoob-kpi-stats', profile?.pa_id, profile?.cooperativa_id, date?.from, date?.to],
    queryFn: () =>
      loadKpiStats({
        paId: profile?.pa_id,
        cooperativeId: profile?.cooperativa_id,
        isDev,
        from: date?.from,
        to: date?.to,
      }),
    enabled: Boolean(isDev || profile?.pa_id || profile?.cooperativa_id),
  });
}

function exportKpiStats(stats: KpiStats) {
  const rows = [
    ['Indicador', 'Valor'],
    ['Pedidos concluídos', stats.orderCount],
    ['Unidades entregues', stats.totalUnits],
    ['Volume total', stats.totalVolume.toFixed(2)],
    ['Ticket médio', stats.ticketMedio.toFixed(2)],
    [],
    ['Mês', 'Volume'],
    ...stats.chartData.map((item) => [item.name, item.valor.toFixed(2)]),
    [],
    ['Produto', 'Unidades'],
    ...stats.productMix.map((item) => [item.name, item.value]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `indicadores-sicoob-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

interface KpiHeaderProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  stats?: KpiStats;
}

function KpiHeader({ date, onDateChange, stats }: KpiHeaderProps) {
  const canExport = Boolean(stats && stats.orderCount > 0);
  return (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">
          Business Intelligence SICOOB
        </h1>
        <p className="text-sm italic text-muted-foreground">
          Insights baseados em dados para decisões estratégicas de Cooperativismo.
        </p>
      </div>
      <div className="flex w-full gap-2 md:w-auto">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal md:w-[280px]',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getShortPeriodLabel(date)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => stats && exportKpiStats(stats)}
          disabled={!canExport}
        >
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}

function MetricCard({ title, value, description, icon }: MetricCardProps) {
  return (
    <Card className="border-[1.5px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function KpiMetricGrid({ stats, isLoading }: { stats?: KpiStats; isLoading: boolean }) {
  const orderCount = stats?.orderCount || 0;
  const ticket = formatMeasuredCurrency(stats?.ticketMedio || 0, orderCount, formatCurrency);
  const volume = formatMeasuredCurrency(stats?.totalVolume || 0, orderCount, formatCurrency);
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <MetricCard
        title="Ticket Médio"
        value={showWhenLoaded(isLoading, ticket)}
        description="Média por pedido concluído"
        icon={<TrendingUp className="h-4 w-4 text-sicoob-green" />}
      />
      <MetricCard
        title="Volume Total"
        value={showWhenLoaded(isLoading, volume)}
        description="Pedidos concluídos no período"
        icon={<Target className="h-4 w-4 text-status-transit" />}
      />
      <MetricCard
        title="Qtd. Pedidos"
        value={showWhenLoaded(isLoading, measuredCount(orderCount, orderCount))}
        description="Solicitações processadas"
        icon={<Clock className="h-4 w-4 text-status-production" />}
      />
      <MetricCard
        title="Unidades Entregues"
        value={showWhenLoaded(isLoading, measuredCount(orderCount, stats?.totalUnits || 0))}
        description="Nos pedidos concluídos"
        icon={<PackageCheck className="h-4 w-4 text-sicoob-green" />}
      />
    </div>
  );
}

function VolumeChart({
  stats,
  isLoading,
  error,
}: {
  stats?: KpiStats;
  isLoading: boolean;
  error: Error | null;
}) {
  const data = stats?.chartData || [];
  const hasNoData = !isLoading && !error && data.length === 0;
  return (
    <Card className="border-[1.5px]">
      <CardHeader>
        <CardTitle>Volume de Pedidos (R$)</CardTitle>
        <CardDescription>Evolução mensal do faturamento consolidado.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {hasNoData ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem pedidos concluídos para compor a série.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `R$${value / 1000}k`}
              />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="valor" fill="#003641" radius={[4, 4, 0, 0]}>
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === data.length - 1 ? '#7DB61C' : '#003641'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ProductMixChart({
  stats,
  isLoading,
  error,
}: {
  stats?: KpiStats;
  isLoading: boolean;
  error: Error | null;
}) {
  const data = stats?.productMix || [];
  const hasNoData = !isLoading && !error && data.length === 0;
  return (
    <Card className="border-[1.5px]">
      <CardHeader>
        <CardTitle>Mix de Produtos</CardTitle>
        <CardDescription>Unidades dos produtos presentes nos pedidos concluídos.</CardDescription>
      </CardHeader>
      <CardContent className="flex h-[300px] items-center justify-center">
        {hasNoData ? (
          <p className="text-sm text-muted-foreground">Sem unidades entregues para compor o mix.</p>
        ) : (
          <ProductMixContent data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function ProductMixContent({ data }: { data: KpiStats['productMix'] }) {
  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="ml-4 flex flex-col gap-2">
        {data.map((product, index) => (
          <div key={product.name} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs font-medium">
              {product.name} ({product.value})
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function SicoobKpiPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const { data: stats, isLoading, error } = useKpiStats(date);

  return (
    <div className="container mx-auto animate-fade-in space-y-6 p-4 sm:p-6">
      <KpiHeader date={date} onDateChange={setDate} stats={stats} />
      <KpiMetricGrid stats={stats} isLoading={isLoading} />
      <p
        className={cn(
          'rounded-lg border px-4 py-3 text-sm',
          error ? 'border-destructive/30 text-destructive' : 'text-muted-foreground',
        )}
      >
        {getKpiContextMessage(error, date, stats)}
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <VolumeChart stats={stats} isLoading={isLoading} error={error} />
        <ProductMixChart stats={stats} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
}
