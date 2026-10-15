import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// import { MainLayout } from "@/components/layout/MainLayout";
import {
  loadTrendsCapabilities,
  loadTrendsActivity,
  resolveTrendsDataAccess,
} from './trends/trends-queries';
import {
  buildTrendsSnapshot,
  buildCivilTrendWindow,
  type AggregatedProduct,
  type AggregatedSearch,
  type ProductFamilyTrend,
  type DailyTrendData,
  type HotSearchItem,
  type KpiSnapshot,
  type TrendsHeatmapData,
} from './trends/trends-projections';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, Search, Package, Calendar, RefreshCw, Download } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { ProductsTabContent, SearchesTabContent } from './trends/TrendsCharts';
import { TrendsKpiCards } from './trends/TrendsKpiCards';
import { UnmetDemandCard } from '@/components/intelligence/UnmetDemandCard';
import { HotSearchesCard } from '@/components/intelligence/HotSearchesCard';
import { ConversionFunnel } from '@/components/intelligence/ConversionFunnel';
import { TrendsHeatmap } from '@/components/intelligence/TrendsHeatmap';
import { TopProductFamiliesCard } from '@/components/intelligence/TopProductFamiliesCard';
import { TrendsInsightsCard } from '@/components/intelligence/TrendsInsightsCard';
import { TrendsForecastChart } from '@/components/intelligence/TrendsForecastChart';
import { SavedViewsManager } from '@/components/intelligence/SavedViewsManager';
import { RealtimeBadge } from '@/components/intelligence/RealtimeBadge';
import { TrendsTour } from '@/components/intelligence/TrendsTour';
import { useUrlState, useUrlBoolean } from '@/hooks/useUrlState';
import { exportTrendsCsv } from '@/lib/trends-export';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isDemoMode } from './trends/is-demo-mode';
import { Badge } from '@/components/ui/badge';

type DateRange = '7d' | '30d' | '90d';

const RANGE_TO_DAYS: Record<DateRange, number> = { '7d': 7, '30d': 30, '90d': 90 };
interface TrendsMockModule {
  MOCK_KPI_CURRENT: KpiSnapshot['current'];
  MOCK_KPI_PREVIOUS: KpiSnapshot['previous'];
  MOCK_PRODUCTS: AggregatedProduct[];
  MOCK_SEARCHES: AggregatedSearch[];
  MOCK_HOT_SEARCHES: Array<{ term: string; count: number; growth: number }>;
  MOCK_TOP_PRODUCT_FAMILIES: Array<{ family: string; views: number }>;
  buildMockDaily: (days: number) => DailyTrendData;
  buildMockHeatmap: () => TrendsHeatmapData;
}

const EMPTY_KPI = { totalViews: 0, totalSearches: 0, uniqueProducts: 0, uniqueSearches: 0 };
const NO_EXPORT_MESSAGE = 'Nada para exportar ainda.';

function isTrendsAccessVisible(
  demo: boolean,
  isFetching: boolean,
  isError: boolean,
  mode: ReturnType<typeof resolveTrendsDataAccess>['mode'],
) {
  if (demo) return true;
  return !isFetching && !isError && mode !== 'unavailable';
}

function useTrendsAccess(userId: string | null, demo: boolean) {
  const capabilities = useQuery({
    queryKey: ['trends-capabilities', userId],
    enabled: !demo && Boolean(userId),
    queryFn: () => {
      if (!userId) throw new Error('Sessão ausente ao validar acesso às tendências.');
      return loadTrendsCapabilities(userId);
    },
  });
  const dataAccess = resolveTrendsDataAccess(userId, capabilities.data);
  return {
    sellerScope: dataAccess.sellerScope,
    dataAccessMode: dataAccess.mode,
    hasAnalyticsAccess: isTrendsAccessVisible(
      demo,
      capabilities.isFetching,
      capabilities.isError,
      dataAccess.mode,
    ),
    accessLoading: !demo && Boolean(userId) && capabilities.isFetching,
    accessError: !demo && capabilities.isError,
    refetchAccess: capabilities.refetch,
    scopeKey: dataAccess.mode === 'all' ? 'all' : (userId ?? 'unavailable'),
    queryEnabled:
      !demo && Boolean(userId) && !capabilities.isError && dataAccess.mode !== 'unavailable',
  };
}

function useTrendsControls() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useUrlState<DateRange>('range', '30d');
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'products');
  const [showCompare, setShowCompare] = useUrlBoolean('cmp', false);
  const [showForecast, setShowForecast] = useUrlBoolean('fc', false);
  const [clock, setClock] = useState(() => ({ referenceDate: new Date(), revision: 0 }));
  const days = RANGE_TO_DAYS[dateRange] ?? 30;
  const demo = isDemoMode();
  const userId = user?.id ?? null;
  const access = useTrendsAccess(userId, demo);
  const dates = useMemo(
    () => buildCivilTrendWindow(clock.referenceDate, days),
    [clock.referenceDate, days],
  );
  const renewDateWindow = useCallback(() => {
    setClock((current) => ({ referenceDate: new Date(), revision: current.revision + 1 }));
  }, []);
  return {
    dateRange,
    setDateRange,
    activeTab,
    setActiveTab,
    showCompare,
    setShowCompare,
    showForecast,
    setShowForecast,
    days,
    demo,
    refreshRevision: clock.revision,
    renewDateWindow,
    ...access,
    ...dates,
  };
}

function resolveKpiDisplay(
  demo: boolean,
  mock: TrendsMockModule | undefined,
  snapshot: KpiSnapshot | undefined,
) {
  if (demo) {
    return {
      current: mock?.MOCK_KPI_CURRENT ?? EMPTY_KPI,
      previous: mock?.MOCK_KPI_PREVIOUS ?? EMPTY_KPI,
    };
  }
  return {
    current: snapshot?.current ?? EMPTY_KPI,
    previous: snapshot?.previous ?? EMPTY_KPI,
  };
}

interface TrendDataResolutionInput {
  demo: boolean;
  mock?: TrendsMockModule;
  days: number;
  products?: AggregatedProduct[];
  searches?: { current: AggregatedSearch[] };
  daily?: DailyTrendData;
}

function resolveTrendData(input: TrendDataResolutionInput) {
  if (input.demo) {
    return {
      products: input.mock?.MOCK_PRODUCTS,
      searches: input.mock?.MOCK_SEARCHES,
      daily: input.mock?.buildMockDaily(input.days) ?? null,
    };
  }
  return { products: input.products, searches: input.searches?.current, daily: input.daily };
}

interface TrendLoadingInput {
  demo: boolean;
  mock: boolean;
  products: boolean;
  searches: boolean;
  daily: boolean;
}

function resolveLoading(input: TrendLoadingInput) {
  if (input.demo) return { products: input.mock, searches: input.mock, daily: input.mock };
  return { products: input.products, searches: input.searches, daily: input.daily };
}

type TrendsControls = ReturnType<typeof useTrendsControls>;

function useTrendQueries(controls: TrendsControls) {
  const activity = useQuery({
    queryKey: ['trends-activity', controls.dateRange, controls.scopeKey, controls.refreshRevision],
    enabled: controls.queryEnabled,
    queryFn: () => loadTrendsActivity(controls.sincePrevious, controls.sellerScope),
  });
  const mock = useQuery({
    queryKey: ['trends-mock'],
    enabled: controls.demo,
    staleTime: Infinity,
    queryFn: () => import('./trends/trends-mock'),
  });
  return { activity, mock };
}

type TrendDisplay = ReturnType<typeof resolveTrendData>;

function useTrendsExports(display: TrendDisplay) {
  const { toast } = useToast();
  const handleExportProducts = () => {
    if (!display.products?.length) {
      toast({ title: 'Sem dados', description: NO_EXPORT_MESSAGE, variant: 'destructive' });
      return;
    }
    exportTrendsCsv(
      'tendencias_produtos',
      display.products.map((product) => ({
        Produto: product.name,
        SKU: product.sku ?? '',
        Visualizações: product.views,
        Detalhes: product.details,
        Comparações: product.compares,
        'Crescimento %':
          product.classification === 'new' ? 'NOVO' : Math.round((product.trendingScore - 1) * 100),
        Classificação: product.classification,
      })),
    );
    toast({ title: 'Exportado', description: 'Arquivo CSV baixado.' });
  };
  const handleExportSearches = () => {
    if (!display.searches?.length) {
      toast({ title: 'Sem dados', description: NO_EXPORT_MESSAGE, variant: 'destructive' });
      return;
    }
    exportTrendsCsv(
      'tendencias_buscas',
      display.searches.map((search) => ({
        Termo: search.term,
        Buscas: search.count,
        'Resultados médios': search.avgResults,
      })),
    );
    toast({ title: 'Exportado', description: 'Arquivo CSV baixado.' });
  };
  return { handleExportProducts, handleExportSearches };
}

type TrendQueries = ReturnType<typeof useTrendQueries>;

function useTrendsSnapshot(controls: TrendsControls, queries: TrendQueries) {
  return useMemo(
    () =>
      queries.activity.data
        ? buildTrendsSnapshot(queries.activity.data, {
            sinceCurrent: controls.sinceCurrent,
            recentCutoff: controls.recentCutoff,
            days: controls.days,
            referenceDate: controls.referenceDate,
          })
        : undefined,
    [
      queries.activity.data,
      controls.sinceCurrent,
      controls.recentCutoff,
      controls.days,
      controls.referenceDate,
    ],
  );
}

function useTrendRefresh(controls: TrendsControls, queries: TrendQueries) {
  return () => {
    if (controls.demo) {
      void queries.mock.refetch();
      return;
    }
    controls.renewDateWindow();
    void controls.refetchAccess();
  };
}

function buildMockHotSearches(mock: TrendsMockModule | undefined): HotSearchItem[] | undefined {
  return mock?.MOCK_HOT_SEARCHES.map((search) => ({
    term: search.term,
    searchCount: search.count,
    previousCount: Math.max(1, Math.round(search.count / (1 + search.growth / 100))),
    delta: search.growth,
  }));
}

function buildMockTopProductFamilies(
  mock: TrendsMockModule | undefined,
): ProductFamilyTrend[] | undefined {
  return mock?.MOCK_TOP_PRODUCT_FAMILIES.map((family, index) => ({
    family: family.family,
    views: family.views,
    recentViews: Math.round(family.views * 0.42),
    baselineViews: Math.round(family.views * 0.58),
    trendingScore: 2 + (mock.MOCK_TOP_PRODUCT_FAMILIES.length - index) * 0.3,
    classification:
      index < 3 ? 'rising' : index === mock.MOCK_TOP_PRODUCT_FAMILIES.length - 1 ? 'new' : 'stable',
    growthPercent: [142, 98, 67, 32, 18, 0][index] ?? 0,
  }));
}

function resolveHotSearchSignals(
  demo: boolean,
  mock: TrendsMockModule | undefined,
  snapshot: ReturnType<typeof useTrendsSnapshot>,
) {
  const items = demo ? buildMockHotSearches(mock) : snapshot?.hotSearches.items;
  const totalSearches = demo
    ? (items?.reduce((total, item) => total + item.searchCount, 0) ?? 0)
    : (snapshot?.hotSearches.totalSearches ?? 0);
  return { items, totalSearches };
}

function resolveTopProductFamilies(
  demo: boolean,
  mock: TrendsMockModule | undefined,
  snapshot: ReturnType<typeof useTrendsSnapshot>,
) {
  return demo ? buildMockTopProductFamilies(mock) : snapshot?.topProductFamilies;
}

function resolveHeatmap(
  demo: boolean,
  mock: TrendsMockModule | undefined,
  snapshot: ReturnType<typeof useTrendsSnapshot>,
) {
  return demo ? mock?.buildMockHeatmap() : snapshot?.heatmap;
}

function useMarketSignals(
  controls: TrendsControls,
  queries: TrendQueries,
  snapshot: ReturnType<typeof useTrendsSnapshot>,
) {
  const hotSearches = resolveHotSearchSignals(controls.demo, queries.mock.data, snapshot);
  const displayTopProductFamilies = resolveTopProductFamilies(
    controls.demo,
    queries.mock.data,
    snapshot,
  );
  const displayHeatmap = useMemo(
    () => resolveHeatmap(controls.demo, queries.mock.data, snapshot),
    [controls.demo, queries.mock.data, snapshot],
  );
  const signalState = controls.demo ? queries.mock : queries.activity;
  return {
    displayHotSearches: hotSearches.items,
    displayHotSearchesTotal: hotSearches.totalSearches,
    displayTopProductFamilies,
    displayHeatmap,
    signalLoading: signalState.isLoading,
    signalError: signalState.isError,
    signalFetching: signalState.isFetching,
  };
}

function useTrendsPageModel() {
  const controls = useTrendsControls();
  const queries = useTrendQueries(controls);
  const snapshot = useTrendsSnapshot(controls, queries);
  const kpis = resolveKpiDisplay(controls.demo, queries.mock.data, snapshot?.kpi);
  const display = resolveTrendData({
    demo: controls.demo,
    mock: queries.mock.data,
    days: controls.days,
    products: snapshot?.products,
    searches: snapshot?.searches,
    daily: snapshot?.daily,
  });
  const displayLoading = resolveLoading({
    demo: controls.demo,
    mock: queries.mock.isLoading,
    products: queries.activity.isLoading,
    searches: queries.activity.isLoading,
    daily: queries.activity.isLoading,
  });
  const exports = useTrendsExports(display);
  const handleRefresh = useTrendRefresh(controls, queries);
  const hasQueryError = !controls.demo && queries.activity.isError;
  const signals = useMarketSignals(controls, queries, snapshot);
  return {
    ...controls,
    kpiCurrent: kpis.current,
    kpiPrevious: kpis.previous,
    loadingMock: queries.mock.isLoading,
    loadingKpi: queries.activity.isLoading,
    mockError: queries.mock.isError,
    kpiError: queries.activity.isError,
    hasQueryError,
    displayProducts: display.products,
    displaySearches: display.searches,
    displayDaily: display.daily,
    displayLoadingProducts: displayLoading.products,
    displayLoadingSearches: displayLoading.searches,
    displayLoadingDaily: displayLoading.daily,
    ...signals,
    handleRefresh,
    ...exports,
  };
}

type TrendsPageModel = ReturnType<typeof useTrendsPageModel>;

function DemoBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-chart-4/40 bg-chart-4/10 text-chart-4">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-chart-4" />
      MODO DEMO — dados fictícios para avaliação
    </Badge>
  );
}

function getTrendsSubtitle(model: TrendsPageModel): string {
  if (model.accessLoading) return 'Validando acesso aos indicadores';
  if (model.accessError) return 'Não foi possível validar o acesso aos indicadores';
  if (model.dataAccessMode === 'all') {
    return 'Crescimento, conversão e demanda reprimida em tempo real';
  }
  if (model.hasAnalyticsAccess) return 'Suas vendas, suas buscas, sua atividade';
  return 'Indicadores disponíveis conforme as permissões do seu perfil';
}

function TrendsHeader({ model }: { model: TrendsPageModel }) {
  const subtitle = getTrendsSubtitle(model);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1
            data-testid="page-title-tendencias"
            className="flex items-center gap-2 font-display text-2xl font-bold text-foreground lg:text-3xl"
          >
            <TrendingUp className="h-7 w-7 text-primary" />
            Análise de Tendências
          </h1>
          {model.hasAnalyticsAccess && (model.demo || model.dataAccessMode === 'all') && (
            <RealtimeBadge />
          )}
          {model.demo && <DemoBadge />}
        </div>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SavedViewsManager />
        <Select
          value={model.dateRange}
          onValueChange={(value) => model.setDateRange(value as DateRange)}
        >
          <SelectTrigger className="w-[140px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={model.handleRefresh} aria-label="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TrendsDecisionSupport({ model }: { model: TrendsPageModel }) {
  const isKpiLoading = model.demo ? model.loadingMock : model.loadingKpi;
  const isKpiError = model.demo ? model.mockError : model.kpiError;
  const showGlobalAnalysis = model.demo || model.dataAccessMode === 'all';
  return (
    <>
      {showGlobalAnalysis && <TrendsInsightsCard days={model.days} />}
      {model.hasQueryError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          Não foi possível carregar parte das tendências. Use Atualizar para tentar novamente.
        </p>
      )}
      <TrendsKpiCards
        current={model.kpiCurrent}
        previous={model.kpiPrevious}
        isLoading={isKpiLoading}
        isError={isKpiError}
        isDemo={model.demo}
      />
      {showGlobalAnalysis && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ConversionFunnel days={model.days} />
            <UnmetDemandCard days={model.days} />
          </div>
          <HotSearchesCard
            days={model.days}
            data={model.displayHotSearches}
            totalSearches={model.displayHotSearchesTotal}
            isLoading={model.signalLoading}
            isError={model.signalError}
            isFetching={model.signalFetching}
            onRetry={model.handleRefresh}
          />
        </>
      )}
    </>
  );
}

function TrendsAccessNotice({ model }: { model: TrendsPageModel }) {
  if (model.accessLoading) {
    return (
      <p role="status" className="rounded-lg border p-4 text-sm">
        Validando acesso às tendências…
      </p>
    );
  }
  if (model.accessError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
      >
        <p>Não foi possível validar seu acesso aos indicadores.</p>
        <Button variant="outline" size="sm" onClick={() => void model.refetchAccess()}>
          Tentar novamente
        </Button>
      </div>
    );
  }
  return (
    <p role="status" className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
      Seu perfil não possui acesso às fontes necessárias para consolidar estes indicadores.
    </p>
  );
}

function TrendsVisualAnalysis({ model }: { model: TrendsPageModel }) {
  const showGlobalAnalysis = model.demo || model.dataAccessMode === 'all';
  return (
    <>
      <TrendsForecastChart
        dailyTrends={model.displayDaily?.current}
        previousTrends={model.displayDaily?.previous}
        isLoading={model.displayLoadingDaily}
        isError={model.signalError}
        isFetching={model.signalFetching}
        onRetry={model.handleRefresh}
        showForecast={model.showForecast}
        onToggleForecast={model.setShowForecast}
        showCompare={model.showCompare}
        onToggleCompare={model.setShowCompare}
      />
      {showGlobalAnalysis && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TrendsHeatmap
            days={model.days}
            data={model.displayHeatmap}
            isLoading={model.signalLoading}
            isError={model.signalError}
            isFetching={model.signalFetching}
            onRetry={model.handleRefresh}
          />
          <TopProductFamiliesCard
            days={model.days}
            data={model.displayTopProductFamilies}
            isLoading={model.signalLoading}
            isError={model.signalError}
            isFetching={model.signalFetching}
            onRetry={model.handleRefresh}
          />
        </div>
      )}
    </>
  );
}

function TrendsRankingTabs({ model }: { model: TrendsPageModel }) {
  const handleExport =
    model.activeTab === 'products' ? model.handleExportProducts : model.handleExportSearches;
  return (
    <Tabs value={model.activeTab} onValueChange={model.setActiveTab} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Produtos em alta
          </TabsTrigger>
          <TabsTrigger value="searches" className="gap-2">
            <Search className="h-4 w-4" />
            Termos mais buscados
          </TabsTrigger>
        </TabsList>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>
      <TabsContent value="products" className="space-y-4">
        <ProductsTabContent
          topProducts={model.displayProducts}
          isLoading={model.displayLoadingProducts}
          isError={model.signalError}
          isFetching={model.signalFetching}
          onRetry={model.handleRefresh}
        />
      </TabsContent>
      <TabsContent value="searches" className="space-y-4">
        <SearchesTabContent
          topSearches={model.displaySearches}
          isLoading={model.displayLoadingSearches}
          isError={model.signalError}
          isFetching={model.signalFetching}
          onRetry={model.handleRefresh}
        />
      </TabsContent>
    </Tabs>
  );
}

export default function TrendsPage() {
  const model = useTrendsPageModel();
  return (
    <>
      <PageSEO
        title="Tendências"
        description="Analise tendências de produtos e buscas."
        path="/tendencias"
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <TrendsHeader model={model} />
        {model.hasAnalyticsAccess ? (
          <>
            <TrendsDecisionSupport model={model} />
            <TrendsVisualAnalysis model={model} />
            <TrendsRankingTabs model={model} />
          </>
        ) : (
          <TrendsAccessNotice model={model} />
        )}
      </div>
      {model.hasAnalyticsAccess && (model.demo || model.dataAccessMode === 'all') && <TrendsTour />}
    </>
  );
}
