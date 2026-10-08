/**
 * Hook para histórico de vendas internas (orçamentos + pedidos) por produto.
 * Consome: quote_items + quotes, order_items + orders do banco local.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { applySellerScope } from '@/lib/auth/apply-seller-scope';

// ---------- Types ----------

export interface DailySalesPoint {
  date: string;
  quotedQty: number;
  orderedQty: number;
  quotedValue: number;
  orderedValue: number;
  quoteCount: number;
  orderCount: number;
}

export interface SellerRanking {
  sellerId: string;
  sellerName: string;
  totalQty: number;
  totalValue: number;
  quoteCount: number;
  orderCount: number;
}

export interface SalesKpis {
  totalQuotedQty: number;
  totalOrderedQty: number;
  totalQuotedValue: number;
  totalOrderedValue: number;
  conversionRate: number; // orders / quotes %
  uniqueSellers: number;
  avgOrderValue: number;
  topSellers: SellerRanking[];
}

export interface QuoteSalesItem {
  quantity: number;
  unit_price: number;
  subtotal: number | null;
  created_at: string;
  quote_id: string;
}

export interface OrderSalesItem {
  quantity: number | null;
  unit_price: number | null;
  created_at: string;
  order_id: string | null;
}

export type SalesDocumentMap = Record<string, { seller_id: string }>;

export async function loadSalesDocumentMaps(
  quoteIds: string[],
  orderIds: string[],
  scope: ReturnType<typeof useSalesScope>,
  userId?: string,
): Promise<{ quotesMap: SalesDocumentMap; ordersMap: SalesDocumentMap }> {
  const [quotesResult, ordersResult] = await Promise.all([
    quoteIds.length > 0
      ? applySellerScope(supabase.from('quotes').select('id, seller_id').in('id', quoteIds).in('status', ['sent', 'approved', 'rejected', 'expired', 'converted']), { scope, userId })
      : Promise.resolve({ data: [] }),
    orderIds.length > 0
      ? applySellerScope(supabase.from('orders').select('id, seller_id').in('id', orderIds), { scope, userId })
      : Promise.resolve({ data: [] }),
  ]);
  const quotesMap: SalesDocumentMap = {};
  const ordersMap: SalesDocumentMap = {};
  for (const quote of quotesResult.data ?? []) quotesMap[quote.id] = { seller_id: quote.seller_id };
  for (const order of ordersResult.data ?? []) ordersMap[order.id] = { seller_id: order.seller_id };
  return { quotesMap, ordersMap };
}

export async function loadSellerNames(
  quotesMap: SalesDocumentMap,
  ordersMap: SalesDocumentMap,
): Promise<Record<string, string>> {
  const sellerIds = [...new Set([
    ...Object.values(quotesMap).map(quote => quote.seller_id),
    ...Object.values(ordersMap).map(order => order.seller_id),
  ])];
  if (sellerIds.length === 0) return {};
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', sellerIds);
  return Object.fromEntries((profiles ?? []).map(profile => [profile.user_id, profile.full_name || 'Vendedor']));
}

function addQuoteDaily(map: Map<string, DailySalesPoint>, item: QuoteSalesItem): void {
  if (!item.created_at) return;
  const date = item.created_at.substring(0, 10);
  const entry = map.get(date) || newDailyPoint(date);
  entry.quotedQty += item.quantity || 0;
  entry.quotedValue += item.subtotal ?? ((item.quantity ?? 0) * (item.unit_price ?? 0));
  entry.quoteCount += 1;
  map.set(date, entry);
}

function addOrderDaily(map: Map<string, DailySalesPoint>, item: OrderSalesItem): void {
  if (!item.created_at) return;
  const date = item.created_at.substring(0, 10);
  const entry = map.get(date) || newDailyPoint(date);
  entry.orderedQty += item.quantity || 0;
  entry.orderedValue += (item.quantity || 0) * (item.unit_price || 0);
  entry.orderCount += 1;
  map.set(date, entry);
}

function sellerEntry(
  sellerId: string,
  names: Record<string, string>,
  map: Map<string, SellerRanking>,
): SellerRanking {
  return map.get(sellerId) || {
    sellerId,
    sellerName: names[sellerId] || 'Vendedor',
    totalQty: 0,
    totalValue: 0,
    quoteCount: 0,
    orderCount: 0,
  };
}

function addQuoteSeller(
  map: Map<string, SellerRanking>,
  item: QuoteSalesItem,
  documents: SalesDocumentMap,
  names: Record<string, string>,
): void {
  const sellerId = documents[item.quote_id]?.seller_id;
  if (!sellerId) return;
  const entry = sellerEntry(sellerId, names, map);
  entry.totalQty += item.quantity || 0;
  entry.totalValue += item.subtotal ?? ((item.quantity ?? 0) * (item.unit_price ?? 0));
  entry.quoteCount += 1;
  map.set(sellerId, entry);
}

function addOrderSeller(
  map: Map<string, SellerRanking>,
  item: OrderSalesItem,
  documents: SalesDocumentMap,
  names: Record<string, string>,
): void {
  const sellerId = documents[item.order_id || '']?.seller_id;
  if (!sellerId) return;
  const entry = sellerEntry(sellerId, names, map);
  entry.totalQty += item.quantity || 0;
  entry.totalValue += (item.quantity || 0) * (item.unit_price || 0);
  entry.orderCount += 1;
  map.set(sellerId, entry);
}

export function aggregateSales({ quoteItems, orderItems, quotesMap, ordersMap, sellerNames }: { quoteItems: QuoteSalesItem[]; orderItems: OrderSalesItem[]; quotesMap: SalesDocumentMap; ordersMap: SalesDocumentMap; sellerNames: Record<string, string> }): { daily: DailySalesPoint[]; kpis: SalesKpis } {
  const dailyMap = new Map<string, DailySalesPoint>();
  const sellerMap = new Map<string, SellerRanking>();
  for (const item of quoteItems) addQuoteDaily(dailyMap, item);
  for (const item of orderItems) addOrderDaily(dailyMap, item);
  for (const item of quoteItems) addQuoteSeller(sellerMap, item, quotesMap, sellerNames);
  for (const item of orderItems) addOrderSeller(sellerMap, item, ordersMap, sellerNames);

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const totalQuotedQty = daily.reduce((sum, point) => sum + point.quotedQty, 0);
  const totalOrderedQty = daily.reduce((sum, point) => sum + point.orderedQty, 0);
  const totalQuotedValue = daily.reduce((sum, point) => sum + point.quotedValue, 0);
  const totalOrderedValue = daily.reduce((sum, point) => sum + point.orderedValue, 0);
  const uniqueQuotes = new Set(quoteItems.map(item => item.quote_id)).size;
  const uniqueOrders = new Set(orderItems.map(item => item.order_id).filter(Boolean)).size;
  return {
    daily,
    kpis: {
      totalQuotedQty,
      totalOrderedQty,
      totalQuotedValue,
      totalOrderedValue,
      conversionRate: uniqueQuotes > 0 ? (uniqueOrders / uniqueQuotes) * 100 : 0,
      uniqueSellers: sellerMap.size,
      avgOrderValue: uniqueOrders > 0 ? totalOrderedValue / uniqueOrders : 0,
      topSellers: Array.from(sellerMap.values()).sort((a, b) => b.totalValue - a.totalValue).slice(0, 5),
    },
  };
}

// ---------- Hook ----------

export function useSalesHistory(productId: string | undefined, days = 30) {
  const { user } = useAuth();
  const scope = useSalesScope();
  return useQuery({
    queryKey: ['sales-history', productId, days, scope, user?.id],
    queryFn: async (): Promise<{ daily: DailySalesPoint[]; kpis: SalesKpis }> => {
      if (!productId) return { daily: [], kpis: emptyKpis() };

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString();

      // Fetch quote items for this product (handle 1000-row limit)
      const { data: quoteItems } = await supabase
        .from('quote_items')
        .select('quantity, unit_price, subtotal, created_at, quote_id')
        .eq('product_id', productId)
        .gte('created_at', cutoffStr)
        .order('created_at', { ascending: true })
        .limit(5000);

      // Fetch order items for this product (handle 1000-row limit)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, unit_price, created_at, order_id')
        .eq('product_id', productId)
        .gte('created_at', cutoffStr)
        .order('created_at', { ascending: true })
        .limit(5000);

      const quoteIds = [...new Set((quoteItems || []).map(q => q.quote_id))];
      const orderIds = [...new Set((orderItems || []).map(o => o.order_id).filter(Boolean))] as string[];
      const { quotesMap, ordersMap } = await loadSalesDocumentMaps(quoteIds, orderIds, scope, user?.id);
      const sellerNames = await loadSellerNames(quotesMap, ordersMap);
      return aggregateSales({ quoteItems: quoteItems || [], orderItems: orderItems || [], quotesMap, ordersMap, sellerNames });
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------- Helpers ----------

function newDailyPoint(date: string): DailySalesPoint {
  return { date, quotedQty: 0, orderedQty: 0, quotedValue: 0, orderedValue: 0, quoteCount: 0, orderCount: 0 };
}

export function emptyKpis(): SalesKpis {
  return {
    totalQuotedQty: 0, totalOrderedQty: 0,
    totalQuotedValue: 0, totalOrderedValue: 0,
    conversionRate: 0, uniqueSellers: 0, avgOrderValue: 0,
    topSellers: [],
  };
}
