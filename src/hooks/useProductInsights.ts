import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
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

/** Quantas consultas ao diretório saem em paralelo no caminho do contrato fechado. */
const SEGMENT_LOOKUP_CHUNK = 8;
/** Teto de clientes distintos consultados um a um, para não abrir uma rajada no CRM. */
const SEGMENT_LOOKUP_CAP = 60;

/**
 * Ramo de atividade por cliente.
 *
 * O `select` genérico resolve tudo numa chamada (`id IN (...)`) e continua sendo o
 * caminho de quem pode usá-lo — dev, supervisor, admin e manager. Para `vendedor`
 * e `agente` a política do portal nega esse `select`, e o contrato fechado aceita
 * um `companyId` escalar por chamada: daí o lote. O escopo de vendedor já reduz a
 * lista de clientes (`applySellerScope`), então o número de chamadas é pequeno
 * justamente para quem cai nesse caminho.
 */
async function fetchSegmentByClient(clientIds: string[]): Promise<Record<string, string>> {
  const { selectCrm, fetchQuoteDirectoryCompanies } = await import("@/lib/crm-db");
  const segmentByClient: Record<string, string> = {};
  try {
    const clients = await selectCrm<{ id: string; ramo_atividade?: string }>("companies", {
      select: "id, ramo_atividade",
      filters: { id: { in: clientIds } },
    });
    for (const client of clients) {
      if (client.ramo_atividade) segmentByClient[client.id] = client.ramo_atividade;
    }
    return segmentByClient;
  } catch {
    // Negado para vendedor e agente: segue pelo contrato fechado.
  }
  const alvos = clientIds.slice(0, SEGMENT_LOOKUP_CAP);
  if (alvos.length < clientIds.length) {
    logger.warn(
      `[product-insights] ramo consultado para ${alvos.length} de ${clientIds.length} clientes (teto do contrato fechado)`,
    );
  }
  for (let inicio = 0; inicio < alvos.length; inicio += SEGMENT_LOOKUP_CHUNK) {
    const lote = alvos.slice(inicio, inicio + SEGMENT_LOOKUP_CHUNK);
    const paginas = await Promise.all(
      lote.map((companyId) => fetchQuoteDirectoryCompanies({ companyId, limit: 1 }).catch(() => [])),
    );
    for (const [company] of paginas) {
      if (company?.ramo_atividade) segmentByClient[company.id] = company.ramo_atividade;
    }
  }
  return segmentByClient;
}

async function fetchTopSegments(orderItems: Array<{ order_id: string | null }>, scope: ReturnType<typeof useSalesScope>, userId?: string) {
  const orderIds = orderItems.map((item) => item.order_id).filter((id): id is string => id !== null);
  if (orderIds.length === 0) return [];
  const { data } = await applySellerScope(supabase.from('orders').select('client_id').in('id', orderIds), { scope, userId });
  const orders = data || [];
  const clientIds = [...new Set(orders.map((order) => order.client_id).filter((id): id is string => Boolean(id)))];
  if (clientIds.length === 0) return [];
  return countOrderSegments(orders, await fetchSegmentByClient(clientIds));
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
