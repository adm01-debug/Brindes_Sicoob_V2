import { useState, useMemo } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Zap, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Clock, 
  Layout, 
  MousePointer2, 
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2
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
  LineChart,
  Line
} from 'recharts';

export default function AdminPerformancePage() {
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [versionFilter, setVersionFilter] = useState('all');

  const { data: vitals, isLoading, refetch } = useQuery({
    queryKey: ['web-vitals', deviceFilter, versionFilter],
    queryFn: async () => {
      let query = supabase
        .from('telemetry_events')
        .select('*')
        .eq('event_type', 'web_vitals')
        .order('created_at', { ascending: false })
        .limit(1000);

      const { data, error } = await query;
      if (error) throw error;
      
      return data.filter(d => {
        const metadata = d.metadata as any;
        if (deviceFilter !== 'all' && metadata.device !== deviceFilter) return false;
        if (versionFilter !== 'all' && metadata.version !== versionFilter) return false;
        return true;
      });
    }
  });

  const stats = useMemo(() => {
    if (!vitals?.length) return null;
    
    const metrics: Record<string, number[]> = { LCP: [], CLS: [], INP: [], TTFB: [] };
    
    vitals.forEach(v => {
      const m = v.metadata as any;
      if (metrics[m.name]) metrics[m.name].push(m.value);
    });

    const getP75 = (arr: number[]) => {

      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const pos = Math.floor(sorted.length * 0.75);
      return sorted[pos];
    };

    return {
      LCP: getP75(metrics.LCP),
      CLS: getP75(metrics.CLS),
      INP: getP75(metrics.INP),
      TTFB: getP75(metrics.TTFB),
      count: vitals.length
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

  const getRating = (name: string, value: number) => {
    if (name === 'LCP') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    if (name === 'CLS') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    if (name === 'INP') return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
    return 'good';
  };


  const getRatingColor = (rating: string) => {
    if (rating === 'good') return 'text-success bg-success/10 border-success/20';
    if (rating === 'needs-improvement') return 'text-warning bg-warning/10 border-warning/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageSEO title="Performance Web Vitals" description="Monitoramento de Core Web Vitals em produção" path="/admin/performance" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Performance Real User Monitoring (RUM)
          </h1>
          <p className="text-muted-foreground">Monitoramento de Core Web Vitals baseados em dados reais de navegação.</p>
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
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {!stats && !isLoading ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Sem dados de performance ainda</h2>
            <p className="text-muted-foreground max-w-md">As métricas começam a aparecer conforme os usuários navegam no site. Certifique-se de que a coleta de Web Vitals está ativa em produção.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  LCP (Largest Contentful Paint)
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-20" /> : `${stats?.LCP.toFixed(0)}ms`}</div>
                <Badge className={cn("mt-2", stats && getRatingColor(getRating('LCP', stats.LCP)))}>
                  {stats && getRating('LCP', stats.LCP).replace('-', ' ')}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  CLS (Cumulative Layout Shift)
                  <Layout className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-20" /> : stats?.CLS.toFixed(3)}</div>
                <Badge className={cn("mt-2", stats && getRatingColor(getRating('CLS', stats.CLS)))}>
                  {stats && getRating('CLS', stats.CLS).replace('-', ' ')}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  INP (Interaction to Next Paint)
                  <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-20" /> : `${stats?.INP.toFixed(0)}ms`}</div>
                <Badge className={cn("mt-2", stats && getRatingColor(getRating('INP', stats.INP)))}>
                  {stats && getRating('INP', stats.INP).replace('-', ' ')}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Amostras Totais
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-20" /> : stats?.count}</div>
                <p className="text-xs text-muted-foreground mt-2">Eventos capturados (últimos 1000)</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral de Métricas (p75)</CardTitle>
                <CardDescription>Percentil 75 para todas as métricas core web vitals.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [`${value}${props.payload.unit}`, name]}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getRating(entry.name, entry.value) === 'good' ? '#10b981' : getRating(entry.name, entry.value) === 'needs-improvement' ? '#f59e0b' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recomendações de Otimização</CardTitle>
                <CardDescription>Sugestões automáticas baseadas nos dados coletados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.LCP > 2500 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-warning/20 bg-warning/5">
                    <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Otimizar LCP</p>
                      <p className="text-xs text-muted-foreground">LCP acima de 2.5s. Verifique o tamanho das imagens do catálogo e considere prefetch para imagens LCP críticas.</p>
                    </div>
                  </div>
                )}
                {stats?.CLS > 0.1 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Problema de Estabilidade (CLS)</p>
                      <p className="text-xs text-muted-foreground">Layout shifts detectados. Verifique se as imagens têm dimensões fixas e se os skeletons de carregamento têm a altura correta.</p>
                    </div>
                  </div>
                )}
                {stats && stats.LCP <= 2500 && stats.CLS <= 0.1 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-success/20 bg-success/5">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Métricas Saudáveis</p>
                      <p className="text-xs text-muted-foreground">Parabéns! Suas métricas Core Web Vitals estão dentro da zona verde.</p>
                    </div>
                  </div>
                )}
                <div className="p-3 rounded-lg border border-primary/10 bg-primary/5">
                  <Badge variant="outline" className="mb-2">Dica de Performance</Badge>
                  <p className="text-xs text-muted-foreground">Utilize o componente <code>&lt;OptimizedImage /&gt;</code> para garantir que o srcset e o fetchpriority sejam aplicados corretamente em todas as imagens do catálogo.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

import { Activity } from 'lucide-react';
