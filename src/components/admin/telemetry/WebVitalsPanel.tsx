import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Gauge, Monitor, Smartphone, Tablet } from "lucide-react";
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  device: 'mobile' | 'desktop' | 'tablet';
  version: string;
}

const NEEDS_IMPROVEMENT = 'needs-improvement' as const;

function ratingColor(rating: string): string {
  if (rating === 'good') return 'text-sicoob-green bg-sicoob-green/10 border-sicoob-green/20';
  if (rating === NEEDS_IMPROVEMENT) return 'text-amber-600 bg-amber-100 border-amber-200';
  if (rating === 'poor') return 'text-destructive bg-destructive/10 border-destructive/20';
  return 'text-muted-foreground bg-muted';
}

function VitalCard({ name, metric }: { name: string; metric: Pick<VitalMetric, 'value' | 'rating'> }) {
  const progress = metric.rating === 'good' ? 100 : metric.rating === NEEDS_IMPROVEMENT ? 60 : metric.rating === 'poor' ? 30 : 0;
  const indicator = metric.rating === 'good' ? "bg-sicoob-green" : metric.rating === NEEDS_IMPROVEMENT ? "bg-amber-500" : "bg-destructive";
  return <Card className="border-border/40"><CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">{name}</CardTitle><Badge className={cn("text-[10px]", ratingColor(metric.rating))}>{metric.rating.replace('-', ' ')}</Badge></CardHeader><CardContent><div className="text-2xl font-display font-bold">{name === 'CLS' ? metric.value.toFixed(3) : `${Math.round(metric.value)}ms`}</div><Progress value={progress} className="h-1 mt-2" indicatorClassName={indicator} /></CardContent></Card>;
}

function DevicePerformance() {
  const devices = [{ device: 'Desktop', icon: Monitor, lcp: 1800, cls: 0.02, inp: 80 }, { device: 'Mobile', icon: Smartphone, lcp: 3400, cls: 0.08, inp: 210 }, { device: 'Tablet', icon: Tablet, lcp: 2200, cls: 0.04, inp: 120 }];
  return <Card className="border-border/40"><CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4" />Performance por Dispositivo</CardTitle></CardHeader><CardContent><div className="space-y-4">{devices.map(device => <div key={device.device} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/20"><div className="flex items-center gap-3"><device.icon className="h-5 w-5 text-muted-foreground" /><span className="font-bold">{device.device}</span></div><div className="flex gap-6 text-xs tabular-nums"><div className="flex flex-col items-end"><span className="text-muted-foreground uppercase font-bold text-[9px]">LCP</span><span className={cn(device.lcp > 2500 ? "text-amber-600" : "text-sicoob-green")}>{device.lcp}ms</span></div><div className="flex flex-col items-end"><span className="text-muted-foreground uppercase font-bold text-[9px]">CLS</span><span>{device.cls.toFixed(3)}</span></div><div className="flex flex-col items-end"><span className="text-muted-foreground uppercase font-bold text-[9px]">INP</span><span className={cn(device.inp > 200 ? "text-amber-600" : "text-sicoob-green")}>{device.inp}ms</span></div></div></div>)}</div></CardContent></Card>;
}

/**
 * WebVitalsPanel — Painel para monitoramento de Core Web Vitals.
 * [OND-025-VITALS]
 */
export function WebVitalsPanel() {
  const [metrics, setMetrics] = useState<VitalMetric[]>([]);
  
  // Mock data para visualização inicial (em produção viria do Supabase)
  useEffect(() => {
    setMetrics([
      { name: 'LCP', value: 2100, rating: 'good', device: 'desktop', version: '2.0.0' },
      { name: 'LCP', value: 3200, rating: NEEDS_IMPROVEMENT, device: 'mobile', version: '2.0.0' },
      { name: 'CLS', value: 0.05, rating: 'good', device: 'desktop', version: '2.0.0' },
      { name: 'INP', value: 150, rating: 'good', device: 'mobile', version: '2.0.0' },
    ]);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-bold flex items-center gap-2">
          <Gauge className="h-5 w-5 text-brand" />
          Web Vitals Real User Monitoring (RUM)
        </h3>
        <Badge variant="outline" className="text-[10px] uppercase font-bold">Live</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['LCP', 'CLS', 'INP', 'FID'].map(name => <VitalCard key={name} name={name} metric={metrics.find(metric => metric.name === name) || { value: 0, rating: 'good' }} />)}
      </div>
      <DevicePerformance />
    </div>
  );
}
