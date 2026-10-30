/**
 * useClientCategoryAffinity — agrega histórico do cliente por CATEGORIA.
 *
 * Reaproveita o RPC `get_client_top_products` (já usado em useClientAffinity)
 * e dobra o resultado por categoria via `categoryResolver`. Quando vazio,
 * cai para mock determinístico baseado em MOCK_CLIENT_STATS.topCategories.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveBICategory, type BICategorySlug } from "@/lib/bi/categoryResolver";
import { MOCK_CLIENT_STATS } from "@/lib/bi/mockData";

export interface ClientTopProductRow {
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  total_quantity: number;
  occurrences: number;
  total_revenue: number;
  avg_unit_price: number;
  last_quoted_at: string | null;
}

export interface CategoryAggregate {
  slug: BICategorySlug | "outros";
  label: string;
  occurrences: number;
  totalQuantity: number;
  totalRevenue: number;
  /** % da receita do cliente que essa categoria representa */
  revenueSharePct: number;
  /** Receita nos últimos 90 dias */
  revenueRecent: number;
  /** Receita 90-180 dias atrás */
  revenuePrevious: number;
  /** Variação % entre janela recente e anterior (null se sem dados anteriores) */
  deltaPct: number | null;
  /** Tendência categórica baseada em deltaPct (limiar ±15%) */
  trend: "up" | "down" | "stable";
  /** Top produtos REAIS dessa categoria (até 5) */
  topProducts: Array<{
    productId: string | null;
    productName: string;
    imageUrl: string | null;
    quantity: number;
    revenue: number;
    avgPrice: number;
  }>;
}

export interface ClientCategoryAffinityResult {
  isMock: boolean;
  realProductsCount: number;
  /** Categorias ordenadas por receita desc */
  categories: CategoryAggregate[];
  /** Categoria favorita (top 1) — null se nenhuma */
  favorite: CategoryAggregate | null;
}

function buildMockResult(): ClientCategoryAffinityResult {
  const totalRev = MOCK_CLIENT_STATS.topCategories.reduce((s, c) => s + c.revenue, 0) || 1;
  // Mock: distribuir 60% receita "recente" e 40% "anterior" com leve variação determinística por slug
  const categories: CategoryAggregate[] = MOCK_CLIENT_STATS.topCategories.map((c, i) => {
    const meta = resolveBICategory(c.category, c.category);
    const recentBias = 0.55 + ((i % 3) - 1) * 0.12; // 0.43, 0.55, 0.67
    const revenueRecent = c.revenue * recentBias;
    const revenuePrevious = c.revenue * (1 - recentBias);
    const deltaPct = revenuePrevious > 0 ? ((revenueRecent - revenuePrevious) / revenuePrevious) * 100 : null;
    const trend: CategoryAggregate["trend"] =
      deltaPct === null || deltaPct === undefined ? "stable" : deltaPct > 15 ? "up" : deltaPct < -15 ? "down" : "stable";
    return {
      slug: meta.slug,
      label: c.category,
      occurrences: c.count,
      totalQuantity: c.count * 12,
      totalRevenue: c.revenue,
      revenueSharePct: (c.revenue / totalRev) * 100,
      revenueRecent,
      revenuePrevious,
      deltaPct,
      trend,
      topProducts: [],
    };
  });
  return {
    isMock: true,
    realProductsCount: 0,
    categories,
    favorite: categories[0] ?? null,
  };
}

function emptyCategory(row: ClientTopProductRow): CategoryAggregate {
  const meta = resolveBICategory(row.product_name);
  return {
    slug: meta.slug,
    label: meta.label,
    occurrences: 0,
    totalQuantity: 0,
    totalRevenue: 0,
    revenueSharePct: 0,
    revenueRecent: 0,
    revenuePrevious: 0,
    deltaPct: null,
    trend: "stable",
    topProducts: [],
  };
}

function addTemporalRevenue(
  category: CategoryAggregate,
  row: ClientTopProductRow,
  revenue: number,
  ...cutoffs: [recentCutoff: number, previousCutoff: number]
) {
  const [recentCutoff, previousCutoff] = cutoffs;
  if (!row.last_quoted_at) return;
  const timestamp = new Date(row.last_quoted_at).getTime();
  if (Number.isNaN(timestamp)) return;
  if (timestamp >= recentCutoff) category.revenueRecent += revenue;
  else if (timestamp >= previousCutoff) category.revenuePrevious += revenue;
}

function aggregateCategories(rows: ClientTopProductRow[]) {
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  const recentCutoff = Date.now() - ninetyDays;
  const previousCutoff = Date.now() - 2 * ninetyDays;
  const categories = new Map<string, CategoryAggregate>();
  for (const row of rows) {
    const key = resolveBICategory(row.product_name).slug;
    const category = categories.get(key) ?? emptyCategory(row);
    const revenue = Number(row.total_revenue) || 0;
    category.occurrences += Number(row.occurrences) || 0;
    category.totalQuantity += Number(row.total_quantity) || 0;
    category.totalRevenue += revenue;
    addTemporalRevenue(category, row, revenue, recentCutoff, previousCutoff);
    category.topProducts.push({
      productId: row.product_id,
      productName: row.product_name,
      imageUrl: row.product_image_url,
      quantity: Number(row.total_quantity) || 0,
      revenue,
      avgPrice: Number(row.avg_unit_price) || 0,
    });
    categories.set(key, category);
  }
  return categories;
}

function categoryDelta(category: CategoryAggregate) {
  if (category.revenuePrevious > 0) {
    return ((category.revenueRecent - category.revenuePrevious) / category.revenuePrevious) * 100;
  }
  return category.revenueRecent > 0 ? 100 : null;
}

function categoryTrend(delta: number | null): CategoryAggregate["trend"] {
  if (delta === null) return "stable";
  if (delta > 15) return "up";
  if (delta < -15) return "down";
  return "stable";
}

function finalizeCategories(byCategory: Map<string, CategoryAggregate>) {
  const totalRevenue = Array.from(byCategory.values())
    .reduce((sum, category) => sum + category.totalRevenue, 0) || 1;
  return Array.from(byCategory.values())
    .map((category) => {
      const deltaPct = categoryDelta(category);
      return {
        ...category,
        revenueSharePct: (category.totalRevenue / totalRevenue) * 100,
        deltaPct,
        trend: categoryTrend(deltaPct),
        topProducts: category.topProducts.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function useClientCategoryAffinity(clientId?: string) {
  const query = useQuery<ClientTopProductRow[]>({
    queryKey: ["bi-client-category-affinity-raw", clientId],
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.rpc("get_client_top_products", {
        _client_id: clientId,
        _limit: 50,
      });
      if (error) return [];
      return (Array.isArray(data) ? data : []) as ClientTopProductRow[];
    },
  });

  const result = useMemo<ClientCategoryAffinityResult>(() => {
    const rows = query.data ?? [];
    if (rows.length === 0) return buildMockResult();

    const categories = finalizeCategories(aggregateCategories(rows));

    return {
      isMock: false,
      realProductsCount: rows.length,
      categories,
      favorite: categories[0] ?? null,
    };
  }, [query.data]);

  return { ...result, isLoading: query.isLoading };
}
