import { supabase } from '@/integrations/supabase/client';

const UNMET_DEMAND_PAGE_SIZE = 500;

interface UnmetDemandRow {
  id: string;
  search_term: string;
  created_at: string;
}

interface UnmetDemandCursor {
  id: string;
  created_at: string;
}

export interface UnmetDemandItem {
  term: string;
  searchCount: number;
  lastSearchedAt: string;
}

export interface UnmetDemandResult {
  items: UnmetDemandItem[];
  totalLostSearches: number;
}

function cursorFilter(cursor: UnmetDemandCursor) {
  return [
    `created_at.lt.${cursor.created_at}`,
    `and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
  ].join(',');
}

function aggregatePage(
  rows: UnmetDemandRow[],
  terms: Map<string, { count: number; last: string }>,
  seenIds: Set<string>,
) {
  let validEvents = 0;
  rows.forEach((row) => {
    if (seenIds.has(row.id)) return;
    seenIds.add(row.id);
    const key = row.search_term.trim().toLowerCase();
    if (!key) return;
    validEvents += 1;
    const existing = terms.get(key) ?? { count: 0, last: row.created_at };
    existing.count += 1;
    if (row.created_at > existing.last) existing.last = row.created_at;
    terms.set(key, existing);
  });
  return validEvents;
}

function nextCursor(rows: UnmetDemandRow[], current: UnmetDemandCursor | null) {
  const last = rows[rows.length - 1];
  if (!last) throw new Error('Página cheia de demanda reprimida sem cursor final.');
  if (current?.id === last.id && current.created_at === last.created_at) {
    throw new Error('A paginação da demanda reprimida não avançou para o próximo cursor.');
  }
  return { id: last.id, created_at: last.created_at };
}

export async function loadUnmetDemand(since: string): Promise<UnmetDemandResult> {
  const terms = new Map<string, { count: number; last: string }>();
  const seenIds = new Set<string>();
  let cursor: UnmetDemandCursor | null = null;
  let totalLostSearches = 0;

  for (;;) {
    let query = supabase
      .from('search_analytics')
      .select('id, search_term, created_at')
      .eq('results_count', 0)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(UNMET_DEMAND_PAGE_SIZE);
    if (cursor) query = query.or(cursorFilter(cursor));

    const { data, error } = await query;
    if (error) throw error;
    const rows = data ?? [];
    totalLostSearches += aggregatePage(rows, terms, seenIds);
    if (rows.length < UNMET_DEMAND_PAGE_SIZE) break;
    cursor = nextCursor(rows, cursor);
  }

  return {
    items: Array.from(terms.entries())
      .map(([term, value]) => ({
        term,
        searchCount: value.count,
        lastSearchedAt: value.last,
      }))
      .sort((left, right) => right.searchCount - left.searchCount)
      .slice(0, 10),
    totalLostSearches,
  };
}
