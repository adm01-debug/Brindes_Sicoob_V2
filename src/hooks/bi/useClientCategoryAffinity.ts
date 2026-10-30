/**
 * useClientCategoryAffinity — agrega histórico do cliente por CATEGORIA.
 *
 * Reaproveita o RPC `get_client_top_products` (já usado em useClientAffinity)
 * e dobra o resultado por categoria via `categoryResolver`. Amostras vazias
 * permanecem vazias; erros de RPC são preservados pelo React Query.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveBICategory, type BICategorySlug } from "@/lib/bi/categoryResolver";

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
  /** A RPC agrega o histórico e não fornece receita segmentada por janela. */
  deltaPct: number | null;
  /** Nulo enquanto a fonte não retornar agregação histórica por período. */
  trend: "up" | "down" | "stable" | null;
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
  dataStatus: "insufficient" | "available" | "unavailable";
  isMock: boolean;
  realProductsCount: number;
  /** Categorias ordenadas por receita desc */
  categories: CategoryAggregate[];
  /** Categoria favorita (top 1) — null se nenhuma */
  favorite: CategoryAggregate | null;
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
    deltaPct: null,
    trend: null,
    topProducts: [],
  };
}

function hasPositiveEvidence(row: ClientTopProductRow) {
  return (Number(row.occurrences) || 0) > 0 ||
    (Number(row.total_quantity) || 0) > 0 ||
    (Number(row.total_revenue) || 0) > 0;
}

function aggregateCategories(rows: ClientTopProductRow[]) {
  const categories = new Map<string, CategoryAggregate>();
  for (const row of rows) {
    if (!hasPositiveEvidence(row)) continue;
    const occurrences = Number(row.occurrences) || 0;
    const quantity = Number(row.total_quantity) || 0;
    const revenue = Number(row.total_revenue) || 0;
    const key = resolveBICategory(row.product_name).slug;
    const category = categories.get(key) ?? emptyCategory(row);
    category.occurrences += occurrences;
    category.totalQuantity += quantity;
    category.totalRevenue += revenue;
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

function finalizeCategories(byCategory: Map<string, CategoryAggregate>) {
  const totalRevenue = Array.from(byCategory.values())
    .reduce((sum, category) => sum + category.totalRevenue, 0) || 1;
  return Array.from(byCategory.values())
    .map((category) => ({
        ...category,
        revenueSharePct: (category.totalRevenue / totalRevenue) * 100,
        topProducts: category.topProducts.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      }))
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
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as ClientTopProductRow[];
    },
  });

  const result = useMemo<ClientCategoryAffinityResult>(() => {
    if (query.isError) {
      return { dataStatus: "unavailable", isMock: false, realProductsCount: 0, categories: [], favorite: null };
    }
    const rows = (query.data ?? []).filter(hasPositiveEvidence);
    if (rows.length === 0) {
      return { dataStatus: "insufficient", isMock: false, realProductsCount: 0, categories: [], favorite: null };
    }

    const categories = finalizeCategories(aggregateCategories(rows));

    return {
      dataStatus: "available",
      isMock: false,
      realProductsCount: rows.length,
      categories,
      favorite: categories[0] ?? null,
    };
  }, [query.data, query.isError]);

  return { ...result, isLoading: query.isLoading, isError: query.isError };
}
