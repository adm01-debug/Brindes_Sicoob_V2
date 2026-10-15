export const TRENDS_INSIGHTS_PAGE_SIZE = 1000;

export interface TrendActivityCursor {
  id: string;
  created_at: string;
}

interface TrendActivityPage<Row> {
  data: Row[] | null;
  error: { message?: string } | null;
}

export function trendCursorFilter(cursor: TrendActivityCursor): string {
  return [
    `created_at.lt.${cursor.created_at}`,
    `and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
  ].join(",");
}

function nextCursor<Row extends TrendActivityCursor>(
  page: Row[],
  current: TrendActivityCursor | null,
): TrendActivityCursor {
  const last = page[page.length - 1];
  if (!last) throw new Error("Página cheia de insights sem cursor final.");
  if (current?.id === last.id && current.created_at === last.created_at) {
    throw new Error("A paginação dos insights não avançou para o próximo cursor.");
  }
  return { id: last.id, created_at: last.created_at };
}

export async function loadAllTrendActivity<Row extends TrendActivityCursor>(
  source: string,
  fetchPage: (cursor: TrendActivityCursor | null) => PromiseLike<TrendActivityPage<Row>>,
): Promise<Row[]> {
  const rows: Row[] = [];
  const seenIds = new Set<string>();
  let cursor: TrendActivityCursor | null = null;

  for (;;) {
    const { data, error } = await fetchPage(cursor);
    if (error) {
      throw new Error(`Falha ao consultar ${source}: ${error.message || "erro desconhecido"}`);
    }

    const page = data ?? [];
    page.forEach((row) => {
      if (seenIds.has(row.id)) return;
      seenIds.add(row.id);
      rows.push(row);
    });
    if (page.length < TRENDS_INSIGHTS_PAGE_SIZE) return rows;
    cursor = nextCursor(page, cursor);
  }
}
