import { supabase } from '@/integrations/supabase/client';

const TRENDS_PAGE_SIZE = 1000;

interface ActivityCursor {
  id: string;
  created_at: string;
}

export interface ProductViewActivity extends ActivityCursor {
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  seller_id: string | null;
  view_type: string | null;
}

export interface SearchActivity extends ActivityCursor {
  search_term: string;
  results_count: number;
  user_id: string | null;
}

export interface TrendsCapabilities {
  canReadAllProductViews: boolean;
  canReadSearchAnalytics: boolean;
}

export interface TrendsDataAccess {
  mode: 'all' | 'self' | 'unavailable';
  sellerScope: string | null;
}

interface ActivityPage<Row> {
  data: Row[] | null;
  error: unknown;
}

export async function loadTrendsCapabilities(userId: string): Promise<TrendsCapabilities> {
  const [productViews, searches] = await Promise.all([
    supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
    supabase.rpc('is_manager_or_admin'),
  ]);
  if (productViews.error || searches.error) throw productViews.error || searches.error;
  return {
    canReadAllProductViews: productViews.data === true,
    canReadSearchAnalytics: searches.data === true,
  };
}

export function resolveTrendsDataAccess(
  userId: string | null | undefined,
  capabilities: TrendsCapabilities | undefined,
): TrendsDataAccess {
  if (!userId || !capabilities?.canReadSearchAnalytics) {
    return { mode: 'unavailable', sellerScope: userId ?? null };
  }
  if (capabilities.canReadAllProductViews) return { mode: 'all', sellerScope: null };
  return { mode: 'self', sellerScope: userId };
}

function appendUniqueRows<Row extends ActivityCursor>(
  target: Row[],
  page: Row[],
  seenIds: Set<string>,
) {
  for (const row of page) {
    if (seenIds.has(row.id)) continue;
    target.push(row);
    seenIds.add(row.id);
  }
}

function nextCursor<Row extends ActivityCursor>(
  page: Row[],
  current: ActivityCursor | null,
): ActivityCursor {
  const lastRow = page[page.length - 1];
  if (!lastRow) throw new Error('Página cheia de tendências sem cursor final.');
  if (current && current.id === lastRow.id && current.created_at === lastRow.created_at) {
    throw new Error('A paginação das tendências não avançou para o próximo cursor.');
  }
  return { id: lastRow.id, created_at: lastRow.created_at };
}

function cursorFilter(cursor: ActivityCursor): string {
  return [
    `created_at.lt.${cursor.created_at}`,
    `and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
  ].join(',');
}

async function loadAllActivity<Row extends ActivityCursor>(
  fetchPage: (cursor: ActivityCursor | null) => PromiseLike<ActivityPage<Row>>,
): Promise<Row[]> {
  const rows: Row[] = [];
  const seenIds = new Set<string>();
  let cursor: ActivityCursor | null = null;

  for (;;) {
    const { data, error } = await fetchPage(cursor);
    if (error) throw error;

    const page = data ?? [];
    appendUniqueRows(rows, page, seenIds);
    if (page.length < TRENDS_PAGE_SIZE) return rows;
    cursor = nextCursor(page, cursor);
  }
}

export function loadProductViewActivity(since: string, userId: string | null) {
  return loadAllActivity<ProductViewActivity>((cursor) => {
    let query = supabase
      .from('product_views')
      .select('id, product_id, product_name, product_sku, seller_id, view_type, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(TRENDS_PAGE_SIZE);
    if (userId) query = query.eq('seller_id', userId);
    if (cursor) query = query.or(cursorFilter(cursor));
    return query;
  });
}

export function loadSearchActivity(since: string, userId: string | null) {
  return loadAllActivity<SearchActivity>((cursor) => {
    let query = supabase
      .from('search_analytics')
      .select('id, search_term, results_count, user_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(TRENDS_PAGE_SIZE);
    if (userId) query = query.eq('user_id', userId);
    if (cursor) query = query.or(cursorFilter(cursor));
    return query;
  });
}

// Os dois eventos usam colunas diferentes para identificar o autor.
export async function loadTrendsActivity(since: string, userId: string | null) {
  const [views, searches] = await Promise.all([
    loadProductViewActivity(since, userId),
    loadSearchActivity(since, userId),
  ]);
  return { views, searches };
}
