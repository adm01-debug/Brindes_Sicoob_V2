import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
// import { MainLayout } from "@/components/layout/MainLayout";
import {
  loadProductViewActivity,
  loadSearchActivity,
  loadTrendsCapabilities,
  loadTrendsActivity,
  resolveTrendsDataAccess,
} from './trends/trends-queries';
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
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageSEO } from '@/components/seo/PageSEO';
import { ProductsTabContent, SearchesTabContent } from './trends/TrendsCharts';
import { TrendsKpiCards } from './trends/TrendsKpiCards';
import { UnmetDemandCard } from '@/components/intelligence/UnmetDemandCard';
import { HotSearchesCard } from '@/components/intelligence/HotSearchesCard';
import { ConversionFunnel } from '@/components/intelligence/ConversionFunnel';
import { TrendsHeatmap } from '@/components/intelligence/TrendsHeatmap';
import { TopCategoriesCard } from '@/components/intelligence/TopCategoriesCard';
import { TrendsInsightsCard } from '@/components/intelligence/TrendsInsightsCard';
import { TrendsForecastChart } from '@/components/intelligence/TrendsForecastChart';
import { SavedViewsManager } from '@/components/intelligence/SavedViewsManager';
import { RealtimeBadge } from '@/components/intelligence/RealtimeBadge';
import { TrendsTour } from '@/components/intelligence/TrendsTour';
import { calculateTrendingScore } from '@/lib/trending-score';
import { useUrlState, useUrlBoolean } from '@/hooks/useUrlState';
import { exportTrendsCsv } from '@/lib/trends-export';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isDemoMode } from './trends/is-demo-mode';
import { Badge } from '@/components/ui/badge';

type DateRange = '7d' | '30d' | '90d';

const RANGE_TO_DAYS: Record<DateRange, number> = { '7d': 7, '30d': 30, '90d': 90 };
const ISO_DAY_FORMAT = 'yyyy-MM-dd';

interface ProductView {
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  view_type: string | null;
  created_at: string;
}

interface SearchRow {
  search_term: string;
  results_count: number;
  created_at: string;
}

interface AggregatedProduct {
  id: string;
  name: string;
  sku?: string;
  views: number;
  details: number;
  compares: number;
  favorites: number;
  recentViews: number;
  baselineViews: number;
  trendingScore: number;
  classification: 'rising' | 'stable' | 'falling' | 'new';
}

interface AggregatedSearch {
  term: string;
  count: number;
  totalResults: number;
  avgResults: number;
}

interface DailyTrendData {
  current: Array<{ date: string; dateLabel: string; views: number; searches: number }>;
  previous: Array<{ date: string; views: number; searches: number }>;
}

interface KpiSnapshot {
  current: {
    totalViews: number;
    totalSearches: number;
    uniqueProducts: number;
    uniqueSearches: number;
  };
  previous: {
    totalViews: number;
    totalSearches: number;
    uniqueProducts: number;
    uniqueSearches: number;
  };
}

interface TrendsMockModule {
  MOCK_KPI_CURRENT: KpiSnapshot['current'];
  MOCK_KPI_PREVIOUS: KpiSnapshot['previous'];
  MOCK_PRODUCTS: AggregatedProduct[];
  MOCK_SEARCHES: AggregatedSearch[];
  buildMockDaily: (days: number) => DailyTrendData;
}

const EMPTY_KPI = { totalViews: 0, totalSearches: 0, uniqueProducts: 0, uniqueSearches: 0 };
const NO_EXPORT_MESSAGE = 'Nada para exportar ainda.';

interface ProductTrendQueryInput {
  sellerScope: string | null;
  sincePrevious: string;
  sinceCurrent: string;
  recentCutoff: string;
  days: number;
}

function createProductAggregate(view: ProductView, key: string): AggregatedProduct {
  return {
    id: key,
    name: view.product_name ?? 'Produto',
    sku: view.product_sku ?? undefined,
    views: 0,
    details: 0,
    compares: 0,
    favorites: 0,
    recentViews: 0,
    baselineViews: 0,
    trendingScore: 0,
    classification: 'stable',
  };
}

function recordCurrentProductView(
  product: AggregatedProduct,
  view: ProductView,
  isRecent: boolean,
) {
  product.views += 1;
  if (view.view_type === 'detail') product.details += 1;
  if (view.view_type === 'compare') product.compares += 1;
  if (view.view_type === 'favorite') product.favorites += 1;
  if (isRecent) product.recentViews += 1;
}

function aggregateProductViews(data: ProductView[], input: ProductTrendQueryInput) {
  const productMap = new Map<string, AggregatedProduct>();
  data.forEach((view) => {
    const key = view.product_id || view.product_name;
    if (!key) return;
    const product = productMap.get(key) ?? createProductAggregate(view, key);
    if (view.created_at >= input.sinceCurrent) {
      recordCurrentProductView(product, view, view.created_at >= input.recentCutoff);
    } else {
      product.baselineViews += 1;
    }
    productMap.set(key, product);
  });
  return productMap;
}

function rankProductTrends(productMap: Map<string, AggregatedProduct>, days: number) {
  const recentDays = Math.max(Math.floor(days / 3), 1);
  const baselineDays = days - recentDays;
  return Array.from(productMap.values())
    .map((product) => {
      const score = calculateTrendingScore({
        recentCount: product.recentViews,
        baselineCount: product.baselineViews,
        recentDays,
        baselineDays,
        totalVolume: product.views,
      });
      return { ...product, trendingScore: score.score, classification: score.classification };
    })
    .filter((product) => product.views > 0)
    .sort(
      (left, right) =>
        right.trendingScore * Math.log(right.views + 1) -
        left.trendingScore * Math.log(left.views + 1),
    )
    .slice(0, 10);
}

async function loadTopProducts(input: ProductTrendQueryInput): Promise<AggregatedProduct[]> {
  const data = await loadProductViewActivity(input.sincePrevious, input.sellerScope);
  return rankProductTrends(aggregateProductViews(data, input), input.days);
}

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
  const days = RANGE_TO_DAYS[dateRange] ?? 30;
  const demo = isDemoMode();
  const userId = user?.id ?? null;
  const access = useTrendsAccess(userId, demo);
  const dates = useMemo(() => {
    const now = new Date();
    return {
      sinceCurrent: subDays(now, days).toISOString(),
      sincePrevious: subDays(now, days * 2).toISOString(),
      recentCutoff: subDays(now, Math.max(Math.floor(days / 3), 1)).toISOString(),
    };
  }, [days]);
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

async function loadTopSearches(controls: TrendsControls) {
  const data = await loadSearchActivity(controls.sincePrevious, controls.sellerScope);
  const current = new Map<string, { count: number; totalResults: number }>();
  (data ?? []).forEach((row: SearchRow) => {
    const term = (row.search_term ?? '').toLowerCase().trim();
    if (!term || row.created_at < controls.sinceCurrent) return;
    const aggregate = current.get(term) ?? { count: 0, totalResults: 0 };
    aggregate.count += 1;
    aggregate.totalResults += row.results_count ?? 0;
    current.set(term, aggregate);
  });
  const currentRows: AggregatedSearch[] = Array.from(current.entries())
    .map(([term, aggregate]) => ({
      term,
      count: aggregate.count,
      totalResults: aggregate.totalResults,
      avgResults: aggregate.count > 0 ? Math.round(aggregate.totalResults / aggregate.count) : 0,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);
  return { current: currentRows };
}

function createActivityBuckets(days: number) {
  const current = new Map<string, { date: string; views: number; searches: number }>();
  const previous = new Map<string, { views: number; searches: number }>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = format(subDays(new Date(), index), ISO_DAY_FORMAT);
    current.set(date, { date, views: 0, searches: 0 });
  }
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = format(subDays(new Date(), days + index), ISO_DAY_FORMAT);
    previous.set(date, { views: 0, searches: 0 });
  }
  return { current, previous };
}

function recordDailyActivity(
  rows: Array<{ created_at: string }>,
  field: 'views' | 'searches',
  buckets: ReturnType<typeof createActivityBuckets>,
) {
  rows.forEach((row) => {
    const date = format(new Date(row.created_at), ISO_DAY_FORMAT);
    const current = buckets.current.get(date);
    if (current) {
      current[field] += 1;
      return;
    }
    const previous = buckets.previous.get(date);
    if (previous) previous[field] += 1;
  });
}

async function loadDailyTrends(controls: TrendsControls): Promise<DailyTrendData> {
  const activity = await loadTrendsActivity(controls.sincePrevious, controls.sellerScope);
  const buckets = createActivityBuckets(controls.days);
  recordDailyActivity(activity.views ?? [], 'views', buckets);
  recordDailyActivity(activity.searches ?? [], 'searches', buckets);
  return {
    current: Array.from(buckets.current.values()).map((row) => ({
      ...row,
      dateLabel: format(new Date(row.date), 'dd/MM', { locale: ptBR }),
    })),
    previous: Array.from(buckets.previous.values()).map((row) => ({ date: '', ...row })),
  };
}

function splitActivityRows<Row extends { created_at: string }>(
  rows: Row[],
  sinceCurrent: string,
  key: (row: Row) => string | null,
) {
  let currentTotal = 0;
  let previousTotal = 0;
  const currentUnique = new Set<string>();
  const previousUnique = new Set<string>();
  rows.forEach((row) => {
    const value = key(row);
    if (row.created_at >= sinceCurrent) {
      currentTotal += 1;
      if (value) currentUnique.add(value);
    } else {
      previousTotal += 1;
      if (value) previousUnique.add(value);
    }
  });
  return {
    currentTotal,
    previousTotal,
    currentUnique: currentUnique.size,
    previousUnique: previousUnique.size,
  };
}

async function loadKpiSnapshot(controls: TrendsControls): Promise<KpiSnapshot> {
  const { views, searches } = await loadTrendsActivity(
    controls.sincePrevious,
    controls.sellerScope,
  );
  const viewStats = splitActivityRows(
    views ?? [],
    controls.sinceCurrent,
    (row) => row.product_id || row.product_name,
  );
  const searchStats = splitActivityRows(searches ?? [], controls.sinceCurrent, (row) =>
    (row.search_term ?? '').toLowerCase(),
  );
  return {
    current: {
      totalViews: viewStats.currentTotal,
      totalSearches: searchStats.currentTotal,
      uniqueProducts: viewStats.currentUnique,
      uniqueSearches: searchStats.currentUnique,
    },
    previous: {
      totalViews: viewStats.previousTotal,
      totalSearches: searchStats.previousTotal,
      uniqueProducts: viewStats.previousUnique,
      uniqueSearches: searchStats.previousUnique,
    },
  };
}

function useTrendQueries(controls: TrendsControls) {
  const common = { dateRange: controls.dateRange, scopeKey: controls.scopeKey, demo: controls.demo };
  const products = useQuery({
    queryKey: ['trends-products', common.dateRange, common.scopeKey, common.demo],
    enabled: controls.queryEnabled,
    queryFn: () => loadTopProducts(controls),
  });
  const searches = useQuery({
    queryKey: ['trends-searches', common.dateRange, common.scopeKey, common.demo],
    enabled: controls.queryEnabled,
    queryFn: () => loadTopSearches(controls),
  });
  const daily = useQuery({
    queryKey: ['trends-daily', common.dateRange, common.scopeKey, common.demo],
    enabled: controls.queryEnabled,
    queryFn: () => loadDailyTrends(controls),
  });
  const kpi = useQuery({
    queryKey: ['trends-kpi-snapshot', common.dateRange, common.scopeKey, common.demo],
    enabled: controls.queryEnabled,
    queryFn: () => loadKpiSnapshot(controls),
  });
  const mock = useQuery({
    queryKey: ['trends-mock'],
    enabled: controls.demo,
    staleTime: Infinity,
    queryFn: () => import('./trends/trends-mock'),
  });
  return { products, searches, daily, kpi, mock };
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

function useTrendRefresh(controls: TrendsControls, queries: TrendQueries) {
  return () => {
    if (!controls.demo) void controls.refetchAccess();
    if (!controls.queryEnabled) return;
    void queries.products.refetch();
    void queries.searches.refetch();
    void queries.daily.refetch();
    void queries.kpi.refetch();
  };
}

function useTrendsPageModel() {
  const controls = useTrendsControls();
  const queries = useTrendQueries(controls);
  const kpis = resolveKpiDisplay(controls.demo, queries.mock.data, queries.kpi.data);
  const display = resolveTrendData({
    demo: controls.demo,
    mock: queries.mock.data,
    days: controls.days,
    products: queries.products.data,
    searches: queries.searches.data,
    daily: queries.daily.data,
  });
  const displayLoading = resolveLoading({
    demo: controls.demo,
    mock: queries.mock.isLoading,
    products: queries.products.isLoading,
    searches: queries.searches.isLoading,
    daily: queries.daily.isLoading,
  });
  const exports = useTrendsExports(display);
  const handleRefresh = useTrendRefresh(controls, queries);
  const hasQueryError =
    !controls.demo &&
    [
      queries.products.isError,
      queries.searches.isError,
      queries.daily.isError,
      queries.kpi.isError,
    ].some(Boolean);
  return {
    ...controls,
    kpiCurrent: kpis.current,
    kpiPrevious: kpis.previous,
    loadingMock: queries.mock.isLoading,
    loadingKpi: queries.kpi.isLoading,
    mockError: queries.mock.isError,
    kpiError: queries.kpi.isError,
    hasQueryError,
    displayProducts: display.products,
    displaySearches: display.searches,
    displayDaily: display.daily,
    displayLoadingProducts: displayLoading.products,
    displayLoadingSearches: displayLoading.searches,
    displayLoadingDaily: displayLoading.daily,
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
          <HotSearchesCard days={model.days} />
        </>
      )}
    </>
  );
}

function TrendsAccessNotice({ model }: { model: TrendsPageModel }) {
  if (model.accessLoading) {
    return <p role="status" className="rounded-lg border p-4 text-sm">Validando acesso às tendências…</p>;
  }
  if (model.accessError) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
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
        showForecast={model.showForecast}
        onToggleForecast={model.setShowForecast}
        showCompare={model.showCompare}
        onToggleCompare={model.setShowCompare}
      />
      {showGlobalAnalysis && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TrendsHeatmap days={model.days} />
          <TopCategoriesCard days={model.days} />
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
        />
      </TabsContent>
      <TabsContent value="searches" className="space-y-4">
        <SearchesTabContent
          topSearches={model.displaySearches}
          isLoading={model.displayLoadingSearches}
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
        ) : <TrendsAccessNotice model={model} />}
      </div>
      {model.hasAnalyticsAccess && (model.demo || model.dataAccessMode === 'all') && (
        <TrendsTour />
      )}
    </>
  );
}
