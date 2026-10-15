import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateTrendingScore } from '@/lib/trending-score';
import type { ProductViewActivity, SearchActivity } from './trends-queries';

const ISO_DAY_FORMAT = 'yyyy-MM-dd';

export interface AggregatedProduct {
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

export interface AggregatedSearch {
  term: string;
  count: number;
  totalResults: number;
  avgResults: number;
}

export interface DailyTrendData {
  current: Array<{ date: string; dateLabel: string; views: number; searches: number }>;
  previous: Array<{ date: string; views: number; searches: number }>;
}

export interface KpiSnapshot {
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

export interface HotSearchItem {
  term: string;
  searchCount: number;
  previousCount: number;
  delta: number;
}

export interface CategoryTrend {
  category: string;
  views: number;
  recentViews: number;
  baselineViews: number;
  trendingScore: number;
  classification: 'rising' | 'stable' | 'falling' | 'new';
  growthPercent: number;
}

export interface TrendsHeatmapData {
  matrix: number[][];
  max: number;
}

export interface TrendsSnapshot {
  products: AggregatedProduct[];
  searches: { current: AggregatedSearch[] };
  daily: DailyTrendData;
  kpi: KpiSnapshot;
  hotSearches: { items: HotSearchItem[]; totalSearches: number };
  topCategories: CategoryTrend[];
  heatmap: TrendsHeatmapData;
}

interface ProjectionInput {
  sinceCurrent: string;
  recentCutoff: string;
  days: number;
  referenceDate: Date;
}

interface TrendsActivity {
  views: ProductViewActivity[];
  searches: SearchActivity[];
}

function createProductAggregate(view: ProductViewActivity, key: string): AggregatedProduct {
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
  view: ProductViewActivity,
  isRecent: boolean,
) {
  product.views += 1;
  if (view.view_type === 'detail') product.details += 1;
  if (view.view_type === 'compare') product.compares += 1;
  if (view.view_type === 'favorite') product.favorites += 1;
  if (isRecent) product.recentViews += 1;
}

function buildTopProducts(data: ProductViewActivity[], input: ProjectionInput) {
  const productMap = new Map<string, AggregatedProduct>();
  data.forEach((view) => {
    const key = view.product_id || view.product_name;
    if (!key) return;
    const product = productMap.get(key) ?? createProductAggregate(view, key);
    if (view.created_at >= input.sinceCurrent) {
      const isRecent = view.created_at >= input.recentCutoff;
      recordCurrentProductView(product, view, isRecent);
      if (!isRecent) product.baselineViews += 1;
    }
    productMap.set(key, product);
  });

  const recentDays = Math.max(Math.floor(input.days / 3), 1);
  const baselineDays = input.days - recentDays;
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

function buildTopSearches(data: SearchActivity[], sinceCurrent: string) {
  const current = new Map<string, { count: number; totalResults: number }>();
  data.forEach((row) => {
    const term = (row.search_term ?? '').toLowerCase().trim();
    if (!term || row.created_at < sinceCurrent) return;
    const aggregate = current.get(term) ?? { count: 0, totalResults: 0 };
    aggregate.count += 1;
    aggregate.totalResults += row.results_count ?? 0;
    current.set(term, aggregate);
  });
  return {
    current: Array.from(current.entries())
      .map(([term, aggregate]) => ({
        term,
        count: aggregate.count,
        totalResults: aggregate.totalResults,
        avgResults: aggregate.count > 0 ? Math.round(aggregate.totalResults / aggregate.count) : 0,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10),
  };
}

function createActivityBuckets(days: number, referenceDate: Date) {
  const current = new Map<string, { date: string; views: number; searches: number }>();
  const previous = new Map<string, { views: number; searches: number }>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = format(subDays(referenceDate, index), ISO_DAY_FORMAT);
    current.set(date, { date, views: 0, searches: 0 });
  }
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = format(subDays(referenceDate, days + index), ISO_DAY_FORMAT);
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

function buildDailyTrends(activity: TrendsActivity, input: ProjectionInput): DailyTrendData {
  const buckets = createActivityBuckets(input.days, input.referenceDate);
  recordDailyActivity(activity.views, 'views', buckets);
  recordDailyActivity(activity.searches, 'searches', buckets);
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

function buildKpiSnapshot(activity: TrendsActivity, sinceCurrent: string): KpiSnapshot {
  const viewStats = splitActivityRows(
    activity.views,
    sinceCurrent,
    (row) => row.product_id || row.product_name,
  );
  const searchStats = splitActivityRows(activity.searches, sinceCurrent, (row) =>
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

function buildHotSearches(
  data: SearchActivity[],
  sinceCurrent: string,
): { items: HotSearchItem[]; totalSearches: number } {
  const current = new Map<string, number>();
  const previous = new Map<string, number>();
  let totalSearches = 0;
  data.forEach((row) => {
    const term = (row.search_term ?? '').trim().toLowerCase();
    if (!term || (row.results_count ?? 0) <= 0) return;
    const target = row.created_at >= sinceCurrent ? current : previous;
    target.set(term, (target.get(term) ?? 0) + 1);
    if (target === current) totalSearches += 1;
  });

  const items = Array.from(current.entries())
    .map(([term, searchCount]) => {
      const previousCount = previous.get(term) ?? 0;
      const delta =
        previousCount === 0 ? 100 : ((searchCount - previousCount) / previousCount) * 100;
      return { term, searchCount, previousCount, delta: Math.round(delta) };
    })
    .sort((left, right) => right.searchCount - left.searchCount)
    .slice(0, 10);
  return { items, totalSearches };
}

function extractCategory(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || 'Outros';
}

function buildTopCategories(data: ProductViewActivity[], input: ProjectionInput): CategoryTrend[] {
  const recentDays = Math.max(Math.floor(input.days / 3), 1);
  const baselineDays = input.days - recentDays;
  const categories = new Map<string, { views: number; recent: number }>();

  data.forEach((view) => {
    if (view.created_at < input.sinceCurrent) return;
    const category = extractCategory(view.product_name);
    const aggregate = categories.get(category) ?? { views: 0, recent: 0 };
    aggregate.views += 1;
    if (view.created_at >= input.recentCutoff) aggregate.recent += 1;
    categories.set(category, aggregate);
  });

  return Array.from(categories.entries())
    .map(([category, aggregate]) => {
      const baselineViews = aggregate.views - aggregate.recent;
      const score = calculateTrendingScore({
        recentCount: aggregate.recent,
        baselineCount: baselineViews,
        recentDays,
        baselineDays,
        totalVolume: aggregate.views,
      });
      return {
        category,
        views: aggregate.views,
        recentViews: aggregate.recent,
        baselineViews,
        trendingScore: score.score,
        classification: score.classification,
        growthPercent: score.growthPercent,
      };
    })
    .filter((category) => category.views >= 2)
    .sort(
      (left, right) =>
        right.trendingScore * Math.log(right.views + 1) -
        left.trendingScore * Math.log(left.views + 1),
    )
    .slice(0, 8);
}

function buildHeatmap(activity: TrendsActivity, sinceCurrent: string): TrendsHeatmapData {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const record = (rows: Array<{ created_at: string }>) => {
    rows.forEach((row) => {
      if (row.created_at < sinceCurrent) return;
      const timestamp = new Date(row.created_at);
      const day = matrix[timestamp.getDay()];
      const hour = timestamp.getHours();
      if (day) day[hour] = (day[hour] ?? 0) + 1;
    });
  };
  record(activity.views);
  record(activity.searches);
  return { matrix, max: Math.max(...matrix.flat()) };
}

export function buildTrendsSnapshot(
  activity: TrendsActivity,
  input: ProjectionInput,
): TrendsSnapshot {
  return {
    products: buildTopProducts(activity.views, input),
    searches: buildTopSearches(activity.searches, input.sinceCurrent),
    daily: buildDailyTrends(activity, input),
    kpi: buildKpiSnapshot(activity, input.sinceCurrent),
    hotSearches: buildHotSearches(activity.searches, input.sinceCurrent),
    topCategories: buildTopCategories(activity.views, input),
    heatmap: buildHeatmap(activity, input.sinceCurrent),
  };
}
