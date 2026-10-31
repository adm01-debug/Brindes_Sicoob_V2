/**
 * Hook para Vendas Internas MACRO (agregadas de todos os vendedores/produtos).
 * Consome: quote_items + order_items do banco local.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import {
  aggregateSales,
  emptyKpis,
  loadSalesDocumentMaps,
  loadSellerNames,
  type DailySalesPoint,
  type SalesKpis,
} from './useSalesHistory';

type SalesScope = ReturnType<typeof useSalesScope>;

interface ScopedDocumentIds {
  quoteIds: string[] | null;
  orderIds: string[] | null;
}

async function loadScopedDocumentIds(
  scope: SalesScope,
  userId: string | undefined,
  cutoff: string,
): Promise<ScopedDocumentIds> {
  if (scope !== 'self' || !userId) return { quoteIds: null, orderIds: null };
  const [quotes, orders] = await Promise.all([
    supabase.from('quotes').select('id').eq('seller_id', userId).gte('created_at', cutoff).limit(2000),
    supabase.from('orders').select('id').eq('seller_id', userId).gte('created_at', cutoff).limit(2000),
  ]);
  return {
    quoteIds: (quotes.data ?? []).map(record => record.id),
    orderIds: (orders.data ?? []).map(record => record.id),
  };
}

function scopedIdsOrSentinel(ids: string[]): string[] {
  return ids.length > 0 ? ids : ['__none__'];
}

async function loadSalesItems(cutoff: string, scoped: ScopedDocumentIds) {
  let quoteQuery = supabase
    .from('quote_items')
    .select('quantity, unit_price, subtotal, created_at, quote_id')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(5000);
  let orderQuery = supabase
    .from('order_items')
    .select('quantity, unit_price, created_at, order_id')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(5000);
  if (scoped.quoteIds) quoteQuery = quoteQuery.in('quote_id', scopedIdsOrSentinel(scoped.quoteIds));
  if (scoped.orderIds) orderQuery = orderQuery.in('order_id', scopedIdsOrSentinel(scoped.orderIds));
  const [quotes, orders] = await Promise.all([quoteQuery, orderQuery]);
  return { quoteItems: quotes.data ?? [], orderItems: orders.data ?? [] };
}

function scopedDocumentsAreEmpty(scoped: ScopedDocumentIds): boolean {
  return scoped.quoteIds?.length === 0 && scoped.orderIds?.length === 0;
}

async function fetchSalesHistoryMacro(
  days: number,
  scope: SalesScope,
  userId: string | undefined,
): Promise<{ daily: DailySalesPoint[]; kpis: SalesKpis }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const scoped = await loadScopedDocumentIds(scope, userId, cutoff.toISOString());
  if (scopedDocumentsAreEmpty(scoped)) return { daily: [], kpis: emptyKpis() };

  const { quoteItems, orderItems } = await loadSalesItems(cutoff.toISOString(), scoped);
  const quoteIds = [...new Set(quoteItems.map(item => item.quote_id))];
  const orderIds = [...new Set(orderItems.map(item => item.order_id).filter(Boolean))] as string[];
  const { quotesMap, ordersMap } = await loadSalesDocumentMaps(quoteIds.slice(0, 500), orderIds.slice(0, 500), scope, userId);
  const sellerNames = await loadSellerNames(quotesMap, ordersMap);
  return aggregateSales({ quoteItems, orderItems, quotesMap, ordersMap, sellerNames });
}

export function useSalesHistoryMacro(days = 30) {
  const { user } = useAuth();
  const scope = useSalesScope();

  return useQuery({
    queryKey: ['sales-history-macro', days, scope, user?.id],
    queryFn: () => fetchSalesHistoryMacro(days, scope, user?.id),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });
}
