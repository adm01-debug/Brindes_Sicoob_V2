/**
 * CatalogQualityDashboard — Enterprise grade panel showing catalog health metrics.
 * 
 * Optimized for performance with >5000 SKUs using react-query caching 
 * and specific aggregate queries.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ImageOff, FolderX, Tag, ListFilter, Activity, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPromobrindProducts, invokeExternalDb } from "@/lib/external-db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QualityMetrics {
  totalSyncRuns: number;
  failedRuns: number;
  lastRunAt: string | null;
  totalRecordsProcessed: number;
  totalRecordsFailed: number;
  catalogSize: number;
  missingImages: number;
  missingCategories: number;
  duplicatedSkus: number | null;
}

function healthBarClass(score: number): string {
  if (score > 90) return 'bg-green-500';
  if (score > 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

function qualityPercentage(missing: number, catalogSize: number): number {
  return 100 - Math.round((missing / Math.max(1, catalogSize)) * 100);
}

function formatLastRun(lastRunAt: string | null): string {
  if (!lastRunAt) return "Nunca executado";
  return format(new Date(lastRunAt), "PPp", { locale: ptBR });
}

function successRate(metrics: QualityMetrics): number {
  return Math.round(((metrics.totalSyncRuns - metrics.failedRuns) / Math.max(1, metrics.totalSyncRuns)) * 100);
}

export function CatalogQualityDashboard() {
  const { data: metrics, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["catalog-quality-metrics"],
    queryFn: async (): Promise<QualityMetrics> => {
      const [syncLogsResult, productCountResult, missingImagesResult, missingCategoriesResult] = await Promise.all([
        supabase
          .from("product_sync_logs")
          .select("status, records_processed, records_failed, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        fetchPromobrindProducts({ limit: 1, returnCount: true }),
        invokeExternalDb({
          table: "v_products_missing_primary_image",
          operation: "select",
          select: "*",
          limit: 1,
          countMode: "exact",
        }),
        invokeExternalDb({
          table: "products",
          operation: "select",
          select: "id",
          filters: { is_active: true, main_category_id_isnull: true },
          limit: 1,
          countMode: "exact",
        }),
      ]);

      if (syncLogsResult.error) throw syncLogsResult.error;
      const catalogSize = productCountResult.count;
      const missingImages = missingImagesResult.count;
      const missingCategories = missingCategoriesResult.count;
      if (
        typeof catalogSize !== "number"
        || typeof missingImages !== "number"
        || typeof missingCategories !== "number"
      ) {
        throw new Error("O banco mestre não retornou contagens exatas de qualidade do catálogo.");
      }

      const rows = syncLogsResult.data ?? [];
      return {
        totalSyncRuns: rows.length,
        failedRuns: rows.filter((r) => r.status === "failed").length,
        lastRunAt: rows[0]?.created_at ?? null,
        totalRecordsProcessed: rows.reduce((sum, r) => sum + (r.records_processed || 0), 0),
        totalRecordsFailed: rows.reduce((sum, r) => sum + (r.records_failed || 0), 0),
        catalogSize,
        missingImages,
        missingCategories,
        duplicatedSkus: null,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const healthScore = useMemo(() => {
    if (!metrics) return 100;
    if (metrics.totalSyncRuns === 0) return 100;
    const syncHealth = 100 - Math.round((metrics.failedRuns / metrics.totalSyncRuns) * 100);
    const dataHealth = 100 - Math.round(((metrics.missingImages + metrics.missingCategories) / (metrics.catalogSize || 1)) * 100);
    return Math.max(0, Math.round((syncHealth + dataHealth) / 2));
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if ((isError || !metrics)) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" />
          <p className="font-medium">Erro ao carregar métricas de qualidade</p>
          <button onClick={() => refetch()} className="text-sm underline mt-2">Tentar novamente</button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {(<div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Monitoramento de Integridade
          </h2>
          <p className="text-sm text-muted-foreground">Visão consolidada da qualidade dos dados e sincronização</p>
        </div>
        <button 
          onClick={() => refetch()} 
          disabled={isRefetching}
          className="p-2 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
          title="Atualizar métricas"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>)}

      {(<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${healthBarClass(healthScore)}`} />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Saúde do Catálogo
              <CheckCircle2 className={`h-4 w-4 ${healthScore > 90 ? 'text-green-500' : 'text-yellow-500'}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore}%</div>
            <p className="text-[10px] text-muted-foreground mt-1">Calculado sobre falhas de sync e gaps de dados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Falhas de Sync
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failedRuns}</div>
            <p className="text-[10px] text-muted-foreground mt-1">em {metrics.totalSyncRuns} execuções (janela de 100)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Gaps de Mídia
              <ImageOff className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.missingImages}</div>
            <p className="text-[10px] text-muted-foreground mt-1">produtos sem imagem vinculada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Volume Ativo
              <ListFilter className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.catalogSize.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">SKUs disponíveis no banco externo</p>
          </CardContent>
        </Card>
      </div>)}

      {(<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Status da Integração
            </CardTitle>
            <CardDescription>Fluxo de dados entre Promobrind e Cloud</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Última execução:</span>
              <span className="font-medium">
                {formatLastRun(metrics.lastRunAt)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Taxa de sucesso:</span>
              <Badge variant={healthScore > 90 ? "default" : "secondary"}>
                {successRate(metrics)}%
              </Badge>
            </div>
            <div className="pt-2 border-t text-xs text-muted-foreground italic">
              * Exibe o histórico persistido das integrações registradas pelo sistema.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderX className="h-4 w-4" /> Qualidade dos Atributos
            </CardTitle>
            <CardDescription>Consistência de campos obrigatórios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Categorização</span>
                <span>{qualityPercentage(metrics.missingCategories, metrics.catalogSize)}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${qualityPercentage(metrics.missingCategories, metrics.catalogSize)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Imagens & Thumbnails</span>
                <span>{qualityPercentage(metrics.missingImages, metrics.catalogSize)}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${qualityPercentage(metrics.missingImages, metrics.catalogSize)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground p-2 bg-muted/50 rounded">
              <Tag className="h-3 w-3" />
              <span>
                SKUs duplicados: {metrics.duplicatedSkus === null
                  ? "não aferido pelo contrato atual do banco mestre"
                  : metrics.duplicatedSkus.toLocaleString("pt-BR")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>)}
    </div>
  );
}
