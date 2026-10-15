/**
 * useCommercialIntelligence — Hook agregador para o módulo de Inteligência Comercial
 * Helpers extraídos para intelligence/intelligenceHelpers.ts
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentOrgId } from '@/hooks/useCurrentOrgId';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { applySellerScope } from '@/lib/auth/apply-seller-scope';
import { getSinceDate, aggregateSegments, aggregateClients } from './intelligence/intelligenceHelpers';

// Re-export types
export type { FilterParams } from './intelligence/intelligenceHelpers';

export interface IntelligenceKPI {
  totalQuotes: number; totalOrders: number; conversionRate: number;
  totalRevenue: number; averageTicket: number;
  quotesThisMonth: number; ordersThisMonth: number; revenueThisMonth: number;
}

export interface TrendingProduct {
  productId: string; productSku: string | null; productName: string; productImage: string | null;
  orderCount: number; totalQuantity: number; totalRevenue: number;
  quoteCount: number; conversionRate: number; trend: 'up' | 'down' | 'stable';
}

export interface SegmentData { segment: string; orderCount: number; revenue: number; averageTicket: number; }

export interface OpportunityProduct {
  productId: string; productSku: string | null; productName: string; productImage: string | null;
  quoteCount: number; orderCount: number; conversionRate: number; opportunityScore: number; reason: string;
}

export interface RevenuePoint { date: string; revenue: number; orders: number; quotes: number; }

export interface CategoryRankingItem {
  categoryId: string; categoryName: string; internalRevenue: number; internalQty: number;
  internalOrders: number; marketDepleted: number; totalScore: number;
}

export interface CategoryRankingData {
  items: CategoryRankingItem[];
  marketAvailable: boolean;
  marketError: string | null;
}

interface ProductCategory {
  catId: string;
  catName: string;
}

interface CategoryProduct {
  id: string;
  category_id?: string | null;
  main_category_id?: string | null;
  category_name?: string | null;
}

interface MarketStockSnapshot extends Record<string, unknown> {
  product_id?: string | null;
  units_depleted?: number | null;
}

type SalesScope = ReturnType<typeof useSalesScope>;
const ORDER_ITEMS_TABLE = 'order_items';
const PRODUCT_ID_COLUMN = 'product_id';
const ORDER_VALUE_FIELDS = 'order_id, quantity, unit_price';

function emptyCommercialKpi(): IntelligenceKPI {
  return { totalQuotes: 0, totalOrders: 0, conversionRate: 0, totalRevenue: 0, averageTicket: 0, quotesThisMonth: 0, ordersThisMonth: 0, revenueThisMonth: 0 };
}

async function loadFilteredKpis(productIds: Set<string>, since: string, startOfMonth: string): Promise<IntelligenceKPI> {
  const ids = Array.from(productIds).slice(0, 200);
  if (ids.length === 0) return emptyCommercialKpi();
  const [{ data: quotes }, { data: orders }, { data: monthOrders }, { data: monthQuotes }] = await Promise.all([
    supabase.from('quote_items').select('quote_id').gte('created_at', since).in(PRODUCT_ID_COLUMN, ids),
    supabase.from(ORDER_ITEMS_TABLE).select(ORDER_VALUE_FIELDS).gte('created_at', since).in(PRODUCT_ID_COLUMN, ids),
    supabase.from(ORDER_ITEMS_TABLE).select(ORDER_VALUE_FIELDS).gte('created_at', startOfMonth).in(PRODUCT_ID_COLUMN, ids),
    supabase.from('quote_items').select('quote_id').gte('created_at', startOfMonth).in(PRODUCT_ID_COLUMN, ids),
  ]);
  const uniqueQuotes = new Set((quotes || []).map(item => item.quote_id)).size;
  const uniqueOrders = new Set((orders || []).map(item => item.order_id)).size;
  const totalRevenue = (orders || []).reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unit_price ?? 0), 0);
  return {
    totalQuotes: uniqueQuotes,
    totalOrders: uniqueOrders,
    conversionRate: uniqueQuotes > 0 ? Math.round((uniqueOrders / uniqueQuotes) * 100) : 0,
    totalRevenue,
    averageTicket: uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0,
    quotesThisMonth: new Set((monthQuotes || []).map(item => item.quote_id)).size,
    ordersThisMonth: new Set((monthOrders || []).map(item => item.order_id)).size,
    revenueThisMonth: (monthOrders || []).reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unit_price ?? 0), 0),
  };
}

async function loadGlobalKpis({ since, startOfMonth, organizationId, scope, userId }: { since: string; startOfMonth: string; organizationId: string | null; scope: SalesScope; userId?: string }): Promise<IntelligenceKPI> {
  let quotesQuery = applySellerScope(supabase.from('quotes').select('id, total').gte('created_at', since), { scope, userId });
  let ordersQuery = applySellerScope(supabase.from('orders').select('id, total').gte('created_at', since), { scope, userId });
  let monthQuotesQuery = applySellerScope(supabase.from('quotes').select('id, total').gte('created_at', startOfMonth), { scope, userId });
  let monthOrdersQuery = applySellerScope(supabase.from('orders').select('id, total').gte('created_at', startOfMonth), { scope, userId });
  if (organizationId) {
    quotesQuery = quotesQuery.eq('organization_id', organizationId);
    ordersQuery = ordersQuery.eq('organization_id', organizationId);
    monthQuotesQuery = monthQuotesQuery.eq('organization_id', organizationId);
    monthOrdersQuery = monthOrdersQuery.eq('organization_id', organizationId);
  }
  const [quotes, orders, monthQuotes, monthOrders] = await Promise.all([
    quotesQuery, ordersQuery, monthQuotesQuery, monthOrdersQuery,
  ]);
  const quoteRows = quotes.data || [];
  const orderRows = orders.data || [];
  const totalRevenue = orderRows.reduce((sum, order) => sum + (order.total ?? 0), 0);
  return {
    totalQuotes: quoteRows.length,
    totalOrders: orderRows.length,
    conversionRate: quoteRows.length > 0 ? Math.round((orderRows.length / quoteRows.length) * 100) : 0,
    totalRevenue,
    averageTicket: orderRows.length > 0 ? totalRevenue / orderRows.length : 0,
    quotesThisMonth: (monthQuotes.data || []).length,
    ordersThisMonth: (monthOrders.data || []).length,
    revenueThisMonth: (monthOrders.data || []).reduce((sum, order) => sum + (order.total ?? 0), 0),
  };
}

interface TrendingOrderRow {
  product_id: string | null;
  product_sku: string | null;
  product_name: string | null;
  product_image_url: string | null;
  quantity: number | null;
  unit_price: number | null;
}

function matchesProductSearch(item: TrendingOrderRow, searchTerm?: string | null): boolean {
  if (!searchTerm) return true;
  const term = searchTerm.toLowerCase();
  return (item.product_name || '').toLowerCase().includes(term) || (item.product_sku || '').toLowerCase().includes(term);
}

function trendingProductKey(item: TrendingOrderRow): string {
  return item.product_sku || item.product_id || item.product_name || '';
}

async function fetchCategoryOrderItems(since: string, productIds?: string[]) {
  const baseQuery = supabase.from('order_items').select('product_id, quantity, unit_price').gte('created_at', since);
  const query = productIds ? baseQuery.in('product_id', productIds) : baseQuery;
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function fetchCategoryMarketSnapshots(since: string): Promise<MarketStockSnapshot[]> {
  const { invokeExternalDb } = await import('@/lib/external-db');
  const result = await invokeExternalDb<MarketStockSnapshot>({
    table: 'stock_daily_summary',
    operation: 'select',
    select: 'product_id,units_depleted',
    filters: { summary_date: `gte.${since.split('T')[0]}` },
    limit: 5000,
  });
  if (!Array.isArray(result?.records) || result.error || result.success === false) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Consulta de dados de mercado incompleta');
  }
  return result.records;
}

function getOrCreateCategory(
  categories: Map<string, CategoryRankingItem>,
  category: ProductCategory,
): CategoryRankingItem {
  const existing = categories.get(category.catId);
  if (existing) return existing;
  const created: CategoryRankingItem = {
    categoryId: category.catId,
    categoryName: category.catName,
    internalRevenue: 0,
    internalQty: 0,
    internalOrders: 0,
    marketDepleted: 0,
    totalScore: 0,
  };
  categories.set(category.catId, created);
  return created;
}

function buildCategoryRanking(
  orderItems: Awaited<ReturnType<typeof fetchCategoryOrderItems>>,
  products: CategoryProduct[],
  marketSnapshots: MarketStockSnapshot[],
): CategoryRankingItem[] {
  const productCategories = new Map<string, ProductCategory>();
  products.forEach((product) => {
    const catId = product.category_id || product.main_category_id || '';
    const catName = product.category_name || catId || 'Sem categoria';
    if (catId) productCategories.set(product.id, { catId, catName });
  });

  const categories = new Map<string, CategoryRankingItem>();
  orderItems.forEach((item) => {
    const category = productCategories.get(item.product_id || '');
    if (!category) return;
    const entry = getOrCreateCategory(categories, category);
    entry.internalRevenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
    entry.internalQty += item.quantity ?? 0;
    entry.internalOrders += 1;
  });
  marketSnapshots.forEach((snapshot) => {
    const category = productCategories.get(snapshot.product_id || '');
    if (!category) return;
    const entry = getOrCreateCategory(categories, category);
    entry.marketDepleted += snapshot.units_depleted ?? 0;
  });

  const items = Array.from(categories.values());
  const maxRevenue = Math.max(1, ...items.map((item) => item.internalRevenue));
  const maxDepleted = Math.max(1, ...items.map((item) => item.marketDepleted));
  items.forEach((item) => { item.totalScore = (item.internalRevenue / maxRevenue) * 60 + (item.marketDepleted / maxDepleted) * 40; });
  return items.sort((a, b) => b.totalScore - a.totalScore).slice(0, 15);
}

function createTrendingProduct(item: TrendingOrderRow): TrendingProduct {
  return {
    productId: item.product_id || '',
    productSku: item.product_sku,
    productName: item.product_name || 'Produto',
    productImage: item.product_image_url,
    orderCount: 0,
    totalQuantity: 0,
    totalRevenue: 0,
    quoteCount: 0,
    conversionRate: 0,
    trend: 'stable',
  };
}

function addTrendingOrder(map: Map<string, TrendingProduct>, item: TrendingOrderRow, searchTerm?: string | null): void {
  const key = trendingProductKey(item);
  if (!key || !matchesProductSearch(item, searchTerm)) return;
  const existing = map.get(key) || createTrendingProduct(item);
  existing.orderCount += 1;
  existing.totalQuantity += item.quantity ?? 0;
  existing.totalRevenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
  map.set(key, existing);
}

interface RevenueOrderRow {
  quantity?: number | null;
  unit_price?: number | null;
  created_at: string;
}

interface RevenueQuoteRow {
  created_at: string;
}

function emptyRevenuePoints(since: Date, days: number): Map<string, RevenuePoint> {
  const points = new Map<string, RevenuePoint>();
  for (let index = 0; index < days; index++) {
    const date = new Date(since);
    date.setDate(date.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    points.set(key, { date: key, revenue: 0, orders: 0, quotes: 0 });
  }
  return points;
}

function aggregateRevenueTrend(
  since: Date,
  days: number,
  orders: RevenueOrderRow[],
  quotes: RevenueQuoteRow[],
): RevenuePoint[] {
  const points = emptyRevenuePoints(since, days);
  for (const order of orders) {
    const point = points.get(new Date(order.created_at).toISOString().slice(0, 10));
    if (!point) continue;
    point.revenue += (order.quantity ?? 1) * (order.unit_price ?? 0);
    point.orders += 1;
  }
  for (const quote of quotes) {
    const point = points.get(new Date(quote.created_at).toISOString().slice(0, 10));
    if (point) point.quotes += 1;
  }
  return Array.from(points.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function filteredRevenueRows(ids: Set<string>, since: string) {
  const productIds = Array.from(ids).slice(0, 200);
  if (productIds.length === 0) return { orders: [] as RevenueOrderRow[], quotes: [] as RevenueQuoteRow[] };
  const [{ data: orders }, { data: quotes }] = await Promise.all([
    supabase.from(ORDER_ITEMS_TABLE).select('quantity, unit_price, created_at').gte('created_at', since).in(PRODUCT_ID_COLUMN, productIds),
    supabase.from('quote_items').select('created_at').gte('created_at', since).in(PRODUCT_ID_COLUMN, productIds),
  ]);
  return { orders: orders || [], quotes: quotes || [] };
}

async function globalRevenueRows(
  since: string,
  organizationId: string | null,
  scope: SalesScope,
  userId: string | undefined,
) {
  let ordersQuery = applySellerScope(supabase.from('orders').select('total, created_at').gte('created_at', since).order('created_at'), { scope, userId });
  let quotesQuery = applySellerScope(supabase.from('quotes').select('created_at').gte('created_at', since).order('created_at'), { scope, userId });
  if (organizationId) {
    ordersQuery = ordersQuery.eq('organization_id', organizationId);
    quotesQuery = quotesQuery.eq('organization_id', organizationId);
  }
  const [orders, quotes] = await Promise.all([
    ordersQuery, quotesQuery,
  ]);
  return {
    orders: (orders.data || []).map(order => ({ quantity: 1, unit_price: order.total, created_at: order.created_at })),
    quotes: quotes.data || [],
  };
}

// ============================================
// useFilteredProductIds
// ============================================
function useFilteredProductIds(categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  return useQuery({
    queryKey: ['intelligence-product-ids', categoryId, supplierId, productId],
    queryFn: async (): Promise<Set<string> | null> => {
      if (productId) return new Set([productId]);
      if (!categoryId && !supplierId) return null;
      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const filters: Record<string, unknown> = {};
      if (categoryId) filters.category_id = categoryId;
      if (supplierId) filters.supplier_id = supplierId;
      const products = await fetchPromobrindProducts({ limit: 5000, filters });
      return new Set(products.map(p => p.id));
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!(categoryId || supplierId || productId),
  });
}

// ============================================
// KPIs
// ============================================
export function useCommercialKPIs(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth();
  const orgId = useCurrentOrgId();
  const scope = useSalesScope();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-intelligence-kpis', user?.id, orgId, scope, days, categoryId, supplierId, productIds ? Array.from(productIds).length : null],
    queryFn: async (): Promise<IntelligenceKPI> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      if (hasFilter && productIds) return loadFilteredKpis(productIds, since, startOfMonth);
      return loadGlobalKpis({ since, startOfMonth, organizationId: orgId, scope, userId: user?.id });
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Trending Products
// ============================================
export function useTrendingProducts(...args: [days?: number, categoryId?: string | null, supplierId?: string | null, productId?: string | null, limit?: number, searchTerm?: string | null]) {
  const [days = 30, categoryId, supplierId, productId, limit = 10, searchTerm] = args;
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-trending-products', user?.id, days, categoryId, supplierId, productId, limit, searchTerm],
    queryFn: async (): Promise<TrendingProduct[]> => {
      const pids = productIds ? Array.from(productIds).slice(0, 200) : undefined;
      const [{ data: orderItems }, { data: quoteItems }] = await Promise.all([
        pids ? supabase.from(ORDER_ITEMS_TABLE).select('product_id, product_sku, product_name, product_image_url, quantity, unit_price, order_id, created_at').gte('created_at', since).in(PRODUCT_ID_COLUMN, pids)
          : supabase.from(ORDER_ITEMS_TABLE).select('product_id, product_sku, product_name, product_image_url, quantity, unit_price, order_id, created_at').gte('created_at', since),
        pids ? supabase.from('quote_items').select('product_id, product_sku, product_name, product_image_url, quantity, unit_price, created_at').gte('created_at', since).in(PRODUCT_ID_COLUMN, pids)
          : supabase.from('quote_items').select('product_id, product_sku, product_name, product_image_url, quantity, unit_price, created_at').gte('created_at', since),
      ]);

      if (!orderItems?.length) return [];
      const productMap = new Map<string, TrendingProduct>();
      orderItems.forEach(item => addTrendingOrder(productMap, item, searchTerm));
      quoteItems?.forEach(item => { const key = item.product_sku || item.product_id || item.product_name; const product = key ? productMap.get(key) : undefined; if (product) product.quoteCount += 1; });

      return Array.from(productMap.values())
        .map(p => ({ ...p, conversionRate: p.quoteCount > 0 ? Math.round((p.orderCount / p.quoteCount) * 100) : 100, trend: (p.totalRevenue > 1000 ? 'up' : p.totalRevenue > 200 ? 'stable' : 'down') as 'up' | 'down' | 'stable' }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, limit);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Segments
// ============================================
export function useSegmentAnalysis(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth(); const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-segments', user?.id, days, categoryId, supplierId],
    queryFn: async (): Promise<SegmentData[]> => {
      if (hasFilter && productIds) {
        const pids = Array.from(productIds).slice(0, 200);
        if (!pids.length) return [];
        const { data: oi } = await supabase.from('order_items').select('order_id').gte('created_at', since).in('product_id', pids);
        const orderIds = [...new Set((oi || []).map(o => o.order_id).filter(Boolean))] as string[];
        if (!orderIds.length) return [];
        // rls-allow: respeita can_view_all_sales server-side
        const { data: orders } = await supabase.from('orders').select('id, client_company, total').in('id', orderIds.slice(0, 200));
        return aggregateSegments(orders || []);
      }
      // rls-allow: respeita can_view_all_sales server-side
      const { data: orders } = await supabase.from('orders').select('client_company, total').gte('created_at', since);
      return aggregateSegments(orders || []);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Opportunities
// ============================================
export function useOpportunities(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth(); const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-opportunities', user?.id, days, categoryId, supplierId],
    queryFn: async (): Promise<OpportunityProduct[]> => {
      const pids = productIds ? Array.from(productIds).slice(0, 200) : undefined;
      const [{ data: quoteItems }, { data: orderItems }] = await Promise.all([
        pids ? supabase.from('quote_items').select('product_id, product_sku, product_name, product_image_url, quantity, created_at').gte('created_at', since).in('product_id', pids)
          : supabase.from('quote_items').select('product_id, product_sku, product_name, product_image_url, quantity, created_at').gte('created_at', since),
        pids ? supabase.from('order_items').select('product_id, product_sku, product_name, created_at').gte('created_at', since).in('product_id', pids)
          : supabase.from('order_items').select('product_id, product_sku, product_name, created_at').gte('created_at', since),
      ]);
      if (!quoteItems?.length) return [];

      const quoteMap = new Map<string, { count: number; name: string; sku: string | null; image: string | null; id: string }>();
      quoteItems.forEach(item => { const key = item.product_sku || item.product_id || ''; if (!key) return; const e = quoteMap.get(key) || { count: 0, name: item.product_name || '', sku: item.product_sku, image: item.product_image_url, id: item.product_id || '' }; e.count += 1; quoteMap.set(key, e); });

      const orderCountMap = new Map<string, number>();
      orderItems?.forEach(item => { const key = item.product_sku || item.product_id || ''; if (key) orderCountMap.set(key, (orderCountMap.get(key) || 0) + 1); });

      const opportunities: OpportunityProduct[] = [];
      quoteMap.forEach((data, key) => {
        const oc = orderCountMap.get(key) || 0;
        const cr = data.count > 0 ? Math.round((oc / data.count) * 100) : 0;
        const score = Math.max(0, 100 - cr) * Math.min(data.count / 3, 1);
        if (data.count >= 2 && cr < 60) {
          opportunities.push({ productId: data.id, productSku: data.sku, productName: data.name, productImage: data.image, quoteCount: data.count, orderCount: oc, conversionRate: cr, opportunityScore: score, reason: cr === 0 ? 'Cotado mas nunca vendido' : cr < 20 ? 'Conversão muito baixa' : 'Conversão abaixo da média' });
        }
      });
      return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Revenue Trend
// ============================================
export function useRevenueTrend(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth(); const orgId = useCurrentOrgId(); const scope = useSalesScope();
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-revenue-trend', user?.id, orgId, scope, days, categoryId, supplierId],
    queryFn: async (): Promise<RevenuePoint[]> => {
      const since = new Date(); since.setDate(since.getDate() - days); const sinceStr = since.toISOString();
      const rows = hasFilter && productIds
        ? await filteredRevenueRows(productIds, sinceStr)
        : await globalRevenueRows(sinceStr, orgId, scope, user?.id);
      return aggregateRevenueTrend(since, days, rows.orders, rows.quotes);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Top Clients
// ============================================
export function useTopClients(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth(); const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-top-clients', user?.id, days, categoryId, supplierId],
    queryFn: async () => {
      if (hasFilter && productIds) {
        const pids = Array.from(productIds).slice(0, 200);
        if (!pids.length) return [];
        const { data: oi } = await supabase.from('order_items').select('order_id, quantity, unit_price').gte('created_at', since).in('product_id', pids);
        const orderIds = [...new Set((oi || []).map(o => o.order_id).filter(Boolean))] as string[];
        if (!orderIds.length) return [];
        // rls-allow: respeita can_view_all_sales server-side
        const { data: orders } = await supabase.from('orders').select('id, client_name, client_company, total').in('id', orderIds.slice(0, 200));
        return aggregateClients(orders || []);
      }
      // rls-allow: respeita can_view_all_sales server-side
      const { data: orders } = await supabase.from('orders').select('client_name, client_company, total').gte('created_at', since);
      return aggregateClients(orders || []);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Category Ranking
// ============================================
export function useCategoryRanking(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth(); const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-category-ranking', user?.id, days, categoryId, supplierId, productId],
    queryFn: async (): Promise<CategoryRankingData> => {
      const pids = productIds ? Array.from(productIds).slice(0, 200) : undefined;
      const orderItems = await fetchCategoryOrderItems(since, pids);
      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const [productsResult, marketResult] = await Promise.allSettled([
        fetchPromobrindProducts({ limit: 5000 }),
        fetchCategoryMarketSnapshots(since),
      ]);
      if (productsResult.status === 'rejected') throw productsResult.reason;

      const marketAvailable = marketResult.status === 'fulfilled';
      const marketSnapshots = marketAvailable ? marketResult.value : [];
      const marketError = marketAvailable
        ? null
        : marketResult.reason instanceof Error
          ? marketResult.reason.message
          : 'Dados de mercado indisponíveis';

      return {
        items: buildCategoryRanking(orderItems, productsResult.value, marketSnapshots),
        marketAvailable,
        marketError,
      };
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Supplier Sales
// ============================================
export function useSupplierSales(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth(); const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-supplier-sales', user?.id, days, categoryId, supplierId],
    queryFn: async () => {
      const pids = productIds ? Array.from(productIds).slice(0, 200) : undefined;
      const { data: orderItems } = pids
        ? await supabase.from('order_items').select('product_id, product_name, quantity, unit_price').gte('created_at', since).in('product_id', pids)
        : await supabase.from('order_items').select('product_id, product_name, quantity, unit_price').gte('created_at', since);
      if (!orderItems?.length) return [];

      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const products = await fetchPromobrindProducts({ limit: 5000 });
      const productSupplierMap = new Map<string, string>();
      products.forEach(p => { productSupplierMap.set(p.id, p.supplier_reference || 'Sem fornecedor'); });

      const supplierMap = new Map<string, { orderCount: number; revenue: number; products: Set<string> }>();
      orderItems.forEach(item => {
        const supplier = productSupplierMap.get(item.product_id || '') || 'Sem fornecedor';
        const e = supplierMap.get(supplier) || { orderCount: 0, revenue: 0, products: new Set<string>() };
        e.orderCount += 1; e.revenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
        if (item.product_id) e.products.add(item.product_id); supplierMap.set(supplier, e);
      });

      return Array.from(supplierMap.entries())
        .map(([supplier, data]) => ({ supplierName: supplier, orderCount: data.orderCount, revenue: data.revenue, productCount: data.products.size }))
        .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}
