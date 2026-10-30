import { useState, useMemo, type ReactNode } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Zap,
  Clock,
  Layout,
  MousePointer2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface PerformanceStats {
  LCP: number;
  CLS: number;
  INP: number;
  TTFB: number;
  count: number;
}

interface PerformanceChartRow {
  name: string;
  value: number;
  unit: string;
  threshold: number;
}

type Rating = 'good' | 'needs-improvement' | 'poor';

const RATING_THRESHOLDS: Record<string, { good: number; acceptable: number }> = {
  LCP: { good: 2500, acceptable: 4000 },
  CLS: { good: 0.1, acceptable: 0.25 },
  INP: { good: 200, acceptable: 500 },
};

function getRating(name: string, value: number): Rating {
  const threshold = RATING_THRESHOLDS[name];
  if (!threshold || value <= threshold.good) return 'good';
  if (value <= threshold.acceptable) return 'needs-improvement';
  return 'poor';
}

function getRatingColor(rating: Rating) {
  if (rating === 'good') {
    return 'text-success bg-success/10 border-success/20';
  }
  if (rating === 'needs-improvement') {
    return 'text-warning bg-warning/10 border-warning/20';
  }
  return 'text-destructive bg-destructive/10 border-destructive/20';
}

function getChartColor(row: PerformanceChartRow) {
  const rating = getRating(row.name, row.value);
  if (rating === 'good') return '#10b981';
  if (rating === 'needs-improvement') return '#f59e0b';
  return '#ef4444';
}

function VitalCard({
  title,
  icon,
  value,
  metric,
  metricValue,
  isLoading,
}: {
  title: string;
  icon: ReactNode;
  value: string | number;
  metric?: string;
  metricValue?: number;
  isLoading: boolean;
}) {
  const rating = metric && metricValue !== undefined ? getRating(metric, metricValue) : undefined;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          {title}
          {icon}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? <Skeleton className="h-8 w-20" /> : value}
        </div>
        {rating ? (
          <Badge className={cn('mt-2', getRatingColor(rating))}>{rating.replace('-', ' ')}</Badge>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Eventos capturados (últimos 1000)</p>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceChart({ data }: { data: PerformanceChartRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Geral de Métricas (p75)</CardTitle>
        <CardDescription>Percentil 75 para todas as métricas core web vitals.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value, name, props) => [`${value}${props.payload.unit}`, name]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getChartColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PerformanceRecommendations({ stats }: { stats: PerformanceStats }) {
  const healthy = stats.LCP <= 2500 && stats.CLS <= 0.1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recomendações de Otimização</CardTitle>
        <CardDescription>Sugestões automáticas baseadas nos dados coletados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.LCP > 2500 && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">Otimizar LCP</p>
              <p className="text-xs text-muted-foreground">
                LCP acima de 2.5s. Verifique o tamanho das imagens do catálogo e considere prefetch
                para imagens LCP críticas.
              </p>
            </div>
          </div>
        )}
        {stats.CLS > 0.1 && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium">Problema de Estabilidade (CLS)</p>
              <p className="text-xs text-muted-foreground">
                Layout shifts detectados. Verifique se as imagens têm dimensões fixas e se os
                skeletons de carregamento têm a altura correta.
              </p>
            </div>
          </div>
        )}
        {healthy && (
          <div className="flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-medium">Métricas Saudáveis</p>
              <p className="text-xs text-muted-foreground">
                Parabéns! Suas métricas Core Web Vitals estão dentro da zona verde.
              </p>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
          <Badge variant="outline" className="mb-2">
            Dica de Performance
          </Badge>
          <p className="text-xs text-muted-foreground">
            Utilize o componente <code>&lt;OptimizedImage /&gt;</code> para garantir que o srcset e
            o fetchpriority sejam aplicados corretamente em todas as imagens do catálogo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceDashboard({
  stats,
  chartData,
  isLoading,
}: {
  stats: PerformanceStats | null;
  chartData: PerformanceChartRow[];
  isLoading: boolean;
}) {
  if (!stats && !isLoading) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Sem dados de performance ainda</h2>
          <p className="max-w-md text-muted-foreground">
            As métricas começam a aparecer conforme os usuários navegam no site. Certifique-se de
            que a coleta de Web Vitals está ativa em produção.
          </p>
        </div>
      </Card>
    );
  }

  const values = stats ?? { LCP: 0, CLS: 0, INP: 0, TTFB: 0, count: 0 };
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <VitalCard
          title="LCP (Largest Contentful Paint)"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          value={`${values.LCP.toFixed(0)}ms`}
          metric="LCP"
          metricValue={values.LCP}
          isLoading={isLoading}
        />
        <VitalCard
          title="CLS (Cumulative Layout Shift)"
          icon={<Layout className="h-4 w-4 text-muted-foreground" />}
          value={values.CLS.toFixed(3)}
          metric="CLS"
          metricValue={values.CLS}
          isLoading={isLoading}
        />
        <VitalCard
          title="INP (Interaction to Next Paint)"
          icon={<MousePointer2 className="h-4 w-4 text-muted-foreground" />}
          value={`${values.INP.toFixed(0)}ms`}
          metric="INP"
          metricValue={values.INP}
          isLoading={isLoading}
        />
        <VitalCard
          title="Amostras Totais"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          value={values.count}
          isLoading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PerformanceChart data={chartData} />
        <PerformanceRecommendations stats={values} />
      </div>
    </>
  );
}

export default function AdminPerformancePage() {
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [versionFilter] = useState('all');

  const {
    data: vitals,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['web-vitals', deviceFilter, versionFilter],
    queryFn: async () => {
      const query = supabase
        .from('telemetry_events')
        .select('*')
        .eq('event_type', 'web_vitals')
        .order('created_at', { ascending: false })
        .limit(1000);

      const { data, error } = await query;
      if (error) throw error;

      return data.filter((d) => {
        const metadata =
          typeof d.metadata === 'object' && d.metadata !== null && !Array.isArray(d.metadata)
            ? (d.metadata as Record<string, unknown>)
            : {};
        if (deviceFilter !== 'all' && metadata.device !== deviceFilter) return false;
        if (versionFilter !== 'all' && metadata.version !== versionFilter) return false;
        return true;
      });
    },
  });

  const stats = useMemo(() => {
    if (!vitals?.length) return null;

    const metrics: Record<string, number[]> = { LCP: [], CLS: [], INP: [], TTFB: [] };

    vitals.forEach((v) => {
      const m = v.metadata as { name?: string; value?: number };
      if (typeof m.name === 'string' && typeof m.value === 'number') {
        const bucket = metrics[m.name];
        if (bucket) bucket.push(m.value);
      }
    });

    const getP75 = (arr: number[]) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const pos = Math.floor(sorted.length * 0.75);
      return sorted[pos] ?? 0;
    };

    return {
      LCP: getP75(metrics.LCP ?? []),
      CLS: getP75(metrics.CLS ?? []),
      INP: getP75(metrics.INP ?? []),
      TTFB: getP75(metrics.TTFB ?? []),
      count: vitals.length,
    };
  }, [vitals]);

  const chartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'LCP', value: stats.LCP, unit: 'ms', threshold: 2500 },
      { name: 'CLS', value: stats.CLS, unit: '', threshold: 0.1 },
      { name: 'INP', value: stats.INP, unit: 'ms', threshold: 200 },
      { name: 'TTFB', value: stats.TTFB, unit: 'ms', threshold: 800 },
    ];
  }, [stats]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <PageSEO
        title="Performance Web Vitals"
        description="Monitoramento de Core Web Vitals em produção"
        path="/admin/performance"
      />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Zap className="h-8 w-8 text-primary" />
            Performance Real User Monitoring (RUM)
          </h1>
          <p className="text-muted-foreground">
            Monitoramento de Core Web Vitals baseados em dados reais de navegação.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={deviceFilter} onValueChange={setDeviceFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Dispositivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Dispositivos</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <PerformanceDashboard stats={stats} chartData={chartData} isLoading={isLoading} />
    </div>
  );
}
