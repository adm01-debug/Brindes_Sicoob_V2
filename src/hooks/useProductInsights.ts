import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { applySellerScope } from '@/lib/auth/apply-seller-scope';

interface ProductInsight {
  totalViews: number;
  totalQuotes: number;
  totalOrders: number;
  conversionRate: number;
  averageQuantity: number;
  topSegments: Array<{
    segment: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: 'view' | 'quote' | 'order';
    date: string;
    details: string;
  }>;
}

const EMPTY_INSIGHT: ProductInsight = {
  totalViews: 0,
  totalQuotes: 0,
  totalOrders: 0,
  conversionRate: 0,
  averageQuantity: 0,
  topSegments: [],
  recentActivity: [],
};

function calculateAverageQuantity(
  quoteItems: Array<{ quantity: number | null }>,
  orderItems: Array<{ quantity: number | null }>,
) {
  const quantities = [
    ...quoteItems.map((item) => item.quantity ?? 0),
    ...orderItems.map((item) => item.quantity ?? 0),
  ];
  if (quantities.length === 0) return 0;
  return quantities.reduce((sum, quantity) => sum + quantity, 0) / quantities.length;
}

function countOrderSegments(
  orders: Array<{ client_id: string | null }>,
  segmentByClient: Record<string, string>,
) {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    const segment = order.client_id ? segmentByClient[order.client_id] : undefined;
    if (segment) counts[segment] = (counts[segment] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([segment, count]) => ({ segment, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

async function fetchTopSegments(orderItems: Array<{ order_id: string | null }>, scope: ReturnType<typeof useSalesScope>, userId?: string) {
  const orderIds = orderItems.map((item) => item.order_id).filter((id): id is string => id !== null);
  if (orderIds.length === 0) return [];
  const { data } = await applySellerScope(supabase.from('orders').select('client_id').in('id', orderIds), { scope, userId });
  const orders = data || [];
  const clientIds = [...new Set(orders.map((order) => order.client_id).filter(Boolean))];
  if (clientIds.length === 0) return [];
  const { selectCrm } = await import("@/lib/crm-db");
  const clients = await selectCrm<{ id: string; ramo_atividade?: string }>("companies", {
    select: "id, ramo_atividade",
    filters: { id: { in: clientIds } },
  });
  const segmentByClient: Record<string, string> = {};
  for (const client of clients) {
    if (client.ramo_atividade) segmentByClient[client.id] = client.ramo_atividade;
  }
  return countOrderSegments(orders, segmentByClient);
}

async function fetchRecentActivity(productSku: string) {
  const recentActivity: ProductInsight['recentActivity'] = [];
  const [{ data: views }, { data: quotes }] = await Promise.all([
    supabase
      .from('product_views')
      .select('created_at, seller_id')
      .eq('product_sku', productSku)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('quote_items')
      .select('created_at, quantity')
      .eq('product_sku', productSku)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);
  for (const view of views || []) {
    recentActivity.push({ type: 'view', date: view.created_at, details: 'Visualizado por um vendedor' });
  }
  for (const quote of quotes || []) {
    recentActivity.push({
      type: 'quote',
      date: quote.created_at,
      details: `Adicionado em cotação (${quote.quantity} un.)`,
    });
  }
  return recentActivity
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

export function useProductInsights(productId?: string, productSku?: string) {
  const { user } = useAuth();
  const scope = useSalesScope();
  return useQuery({
    queryKey: ['product-insights', productSku, scope, user?.id],
    queryFn: async (): Promise<ProductInsight> => {
      if (!productSku) return EMPTY_INSIGHT;

      const { count: viewsCount } = await supabase
        .from('product_views')
        .select('*', { count: 'exact', head: true })
        .eq('product_sku', productSku);

      const { data: quoteItems, count: quotesCount } = await supabase
        .from('quote_items')
        .select('quantity, quote_id', { count: 'exact' })
        .eq('product_sku', productSku);

      const { data: orderItems, count: ordersCount } = await supabase
        .from('order_items')
        .select('quantity, order_id', { count: 'exact' })
        .eq('product_sku', productSku);

      const quotes = quoteItems || [];
      const orders = orderItems || [];
      const averageQuantity = calculateAverageQuantity(quotes, orders);
      const conversionRate = quotesCount ? ((ordersCount || 0) / quotesCount) * 100 : 0;
      const [topSegments, recentActivity] = await Promise.all([
        fetchTopSegments(orders, scope, user?.id),
        fetchRecentActivity(productSku),
      ]);

      return {
        totalViews: viewsCount || 0,
        totalQuotes: quotesCount || 0,
        totalOrders: ordersCount || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        averageQuantity: Math.round(averageQuantity),
        topSegments,
        recentActivity,
      };
    },
    enabled: !!productSku,
    staleTime: 5 * 60 * 1000,
  });
}
