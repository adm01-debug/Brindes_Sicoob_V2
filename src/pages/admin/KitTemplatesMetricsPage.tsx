/**
 * KitTemplatesMetricsPage — Painel admin com métricas de adoção de templates
 * + heatmap dos itens (SKUs) mais usados em kits do sistema.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSEO } from '@/components/seo/PageSEO';
// import { MainLayout } from "@/components/layout/MainLayout";
import { TrendingUp, Package, Award, Share2, Eye, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/kit-builder';

interface TemplateRow {
  id: string;
  name: string;
  tag: string | null;
  color: string;
  total_price: number;
  usage_count: number;
  updated_at: string;
  category: string;
}

interface KitRow {
  id: string;
  items_data: unknown;
}

function extractItem(item: unknown): { sku: string; name: string } | null {
  const record = item as Record<string, unknown>;
  const skuValue = record.sku ?? record.product_sku ?? record.code;
  if (!skuValue) return null;
  const sku = String(skuValue);
  const nameValue = record.name ?? record.product_name;
  return { sku: sku.toLowerCase(), name: nameValue ? String(nameValue) : sku };
}

function extractItems(items: unknown): Array<{ sku: string; name: string }> {
  if (!Array.isArray(items)) return [];
  return items
    .map(extractItem)
    .filter((x): x is { sku: string; name: string } => !!x);
}

export default function KitTemplatesMetricsPage() {
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['admin-kit-templates-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_templates')
        .select('id, name, tag, color, total_price, usage_count, updated_at, category')
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
  });

  const { data: heatmap, isLoading: loadingHeatmap } = useQuery({
    queryKey: ['admin-kit-items-heatmap'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_kits')
        .select('id, items_data')
        .limit(1000);
      if (error) throw error;
      const counter = new Map<string, { name: string; count: number }>();
      for (const row of (data ?? []) as KitRow[]) {
        for (const it of extractItems(row.items_data)) {
          const cur = counter.get(it.sku);
          if (cur) cur.count += 1;
          else counter.set(it.sku, { name: it.name, count: 1 });
        }
      }
      return Array.from(counter.entries())
        .map(([sku, v]) => ({ sku, name: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    },
  });

  // Conversão de compartilhamentos: gerados vs visualizados
  const { data: shareConversion, isLoading: loadingShare } = useQuery({
    queryKey: ['admin-kit-share-conversion'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_share_tokens')
        .select('id, viewed_at, status, created_at')
        .limit(5000);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ id: string; viewed_at: string | null; status: string; created_at: string }>;
      const generated = rows.length;
      const active = rows.filter((r) => r.status === 'active').length;
      const revoked = rows.filter((r) => r.status === 'revoked').length;
      const viewed = rows.filter((r) => r.viewed_at).length;
      const rate = generated > 0 ? (viewed / generated) * 100 : 0;
      // Últimos 30 dias
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
      const recentViewed = recent.filter((r) => r.viewed_at).length;
      const recentRate = recent.length > 0 ? (recentViewed / recent.length) * 100 : 0;
      return {
        generated, active, revoked, viewed, rate,
        recent: recent.length, recentViewed, recentRate,
      };
    },
  });

  const stats = useMemo(() => {
    const list = templates ?? [];
    const totalUsage = list.reduce((s, t) => s + (t.usage_count || 0), 0);
    const popular = list.filter((t) => (t.usage_count || 0) >= 5).length;
    return { total: list.length, totalUsage, popular };
  }, [templates]);

  const maxCount = heatmap?.[0]?.count ?? 1;

  return (
    <>
      <PageSEO
        title="Métricas de Templates de Kit"
        description="Adoção e desempenho dos templates de kit do sistema."
        path="/admin/kit-templates/metricas"
        noIndex
      />
      <div className="container max-w-[1400px] py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-semibold">Métricas de Kits</h1>
          <p className="text-sm text-muted-foreground">
            Adoção de templates e itens mais usados pela equipe.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Templates ativos</p>
                <p className="text-2xl font-display font-semibold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clonagens totais</p>
                <p className="text-2xl font-display font-semibold">{stats.totalUsage}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Templates populares (≥5 usos)</p>
                <p className="text-2xl font-display font-semibold">{stats.popular}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <TemplatesRankingCard loading={loadingTemplates} templates={templates ?? []} />
        <ItemsHeatmapCard loading={loadingHeatmap} items={heatmap ?? []} maxCount={maxCount} />
        <ShareConversionCard loading={loadingShare} conversion={shareConversion} />
      </div>
    </>
  );
}

function TemplatesRankingCard({ loading, templates }: { loading: boolean; templates: TemplateRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Ranking de templates</CardTitle></CardHeader>
      <CardContent>
        {loading ? <div className="space-y-2">{[1, 2, 3].map((index) => <Skeleton key={index} className="h-10 w-full" />)}</div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Template</TableHead><TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead><TableHead className="text-right">Clonagens</TableHead>
              <TableHead>Última atualização</TableHead></TableRow></TableHeader>
            <TableBody>{templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell><div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: template.color }} />
                  <span className="font-medium">{template.name}</span>
                  {template.tag && <Badge variant="outline" className="text-[10px]">{template.tag}</Badge>}
                </div></TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px]">{template.category}</Badge></TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(template.total_price)}</TableCell>
                <TableCell className="text-right"><Badge variant={template.usage_count >= 5 ? 'default' : 'outline'}>{template.usage_count}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(template.updated_at).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

interface HeatmapItem { sku: string; name: string; count: number }

function ItemsHeatmapCard({ loading, items, maxCount }: { loading: boolean; items: HeatmapItem[]; maxCount: number }) {
  let content;
  if (loading) content = <div className="space-y-2">{[1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-8 w-full" />)}</div>;
  else if (items.length === 0) content = <p className="text-sm text-muted-foreground">Sem dados ainda.</p>;
  else content = <div className="space-y-1.5">{items.map((item, index) => (
    <div key={item.sku} className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground tabular-nums w-6 text-right">{index + 1}.</span>
      <span className="truncate flex-1 font-medium">{item.name}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{item.count}×</span>
      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${(item.count / maxCount) * 100}%` }} />
      </div>
    </div>
  ))}</div>;
  return <Card><CardHeader><CardTitle className="text-base">Top 20 itens mais usados em kits</CardTitle></CardHeader><CardContent>{content}</CardContent></Card>;
}

interface ShareConversion {
  generated: number; active: number; revoked: number; viewed: number; rate: number;
  recent: number; recentViewed: number; recentRate: number;
}

function pluralSuffix(value: number): string { return value === 1 ? '' : 's'; }

function ShareConversionCard({ loading, conversion }: { loading: boolean; conversion: ShareConversion | undefined }) {
  let content;
  if (loading) {
    content = <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-20" />)}</div>;
  } else if (!conversion || conversion.generated === 0) {
    content = <p className="text-sm text-muted-foreground py-4">Nenhum link de apresentação gerado ainda.</p>;
  } else {
    content = <ShareConversionDetails conversion={conversion} />;
  }
  return (
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2">
      <Share2 className="h-4 w-4 text-primary" />Conversão de compartilhamentos
    </CardTitle></CardHeader><CardContent>{content}</CardContent></Card>
  );
}

function ShareConversionDetails({ conversion }: { conversion: ShareConversion }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gerados</p><p className="text-2xl font-display font-semibold tabular-nums">{conversion.generated}</p></div>
        <div className="rounded-lg border bg-card/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Visualizados</p><p className="text-2xl font-display font-semibold tabular-nums">{conversion.viewed}</p></div>
        <div className="rounded-lg border bg-card/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" /> Taxa</p><p className="text-2xl font-display font-semibold tabular-nums text-primary">{conversion.rate.toFixed(1)}%</p></div>
        <div className="rounded-lg border bg-card/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ativos / Revogados</p><p className="text-sm font-medium tabular-nums mt-1"><span className="text-success">{conversion.active}</span><span className="text-muted-foreground"> / </span><span className="text-destructive">{conversion.revoked}</span></p></div>
      </div>
      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="font-medium mb-1">Últimos 30 dias</p>
        <p className="text-muted-foreground text-xs">
          {conversion.recent} link{pluralSuffix(conversion.recent)} gerado{pluralSuffix(conversion.recent)} •{' '}
          {conversion.recentViewed} visualizado{pluralSuffix(conversion.recentViewed)} •{' '}
          <span className="text-primary font-medium">{conversion.recentRate.toFixed(1)}%</span> de conversão
        </p>
      </div>
    </div>
  );
}
