/**
 * useIndustryCategoryTrends — agrega top produtos do setor por CATEGORIA.
 *
 * Reaproveita o RPC `get_industry_top_products` (já usado em useIndustryTrends)
 * e dobra o resultado por categoria. Amostras vazias permanecem vazias.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { selectCrm } from "@/lib/crm-db";
import { resolveBICategory, type BICategorySlug } from "@/lib/bi/categoryResolver";

export interface IndustryCategoryAggregate {
  slug: BICategorySlug | "outros";
  label: string;
  totalQuantity: number;
  uniqueClients: number;
  totalRevenue: number;
  /** % da receita do setor que essa categoria representa */
  revenueSharePct: number;
  topProducts: Array<{
    productId: string | null;
    productName: string;
    imageUrl: string | null;
    quantity: number;
    revenue: number;
    avgPrice: number;
  }>;
}

export interface IndustryCategoryTrendsResult {
  dataStatus: "insufficient" | "available" | "unavailable";
  isMock: boolean;
  companiesInRamo: number;
  categories: IndustryCategoryAggregate[];
}

interface IndustryRow {
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  total_quantity: number;
  unique_clients: number;
  total_revenue: number;
  avg_unit_price: number;
}

async function fetchCompanyIds(ramoAtividade: string) {
  const companies = await selectCrm<{ id: string }>("companies", {
    select: "id",
    filters: { ramo_atividade: ramoAtividade, deleted_at: null },
    limit: 500,
  });
  return companies.map((company) => company.id).filter(Boolean);
}

async function fetchIndustryRows(companyIds: string[]) {
  const { data, error } = await supabase.rpc("get_industry_top_products", {
    _company_ids: companyIds,
    _days: 90,
    _limit: 50,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data as unknown as IndustryRow[];
}

function aggregateIndustryRows(rows: IndustryRow[]) {
  const byCategory = new Map<string, IndustryCategoryAggregate>();
  for (const row of rows) {
    const meta = resolveBICategory(row.product_name);
    const category = byCategory.get(meta.slug) ?? {
      slug: meta.slug,
      label: meta.label,
      totalQuantity: 0,
      uniqueClients: 0,
      totalRevenue: 0,
      revenueSharePct: 0,
      topProducts: [],
    };
    category.totalQuantity += Number(row.total_quantity) || 0;
    category.uniqueClients += Number(row.unique_clients) || 0;
    category.totalRevenue += Number(row.total_revenue) || 0;
    category.topProducts.push({
      productId: row.product_id,
      productName: row.product_name,
      imageUrl: row.product_image_url,
      quantity: Number(row.total_quantity) || 0,
      revenue: Number(row.total_revenue) || 0,
      avgPrice: Number(row.avg_unit_price) || 0,
    });
    byCategory.set(meta.slug, category);
  }
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

async function fetchIndustryCategoryTrends(ramoAtividade: string | null | undefined) {
  if (!ramoAtividade) return { dataStatus: "insufficient" as const, isMock: false, companiesInRamo: 0, categories: [] };
  const companyIds = await fetchCompanyIds(ramoAtividade);
  if (companyIds.length === 0) return { dataStatus: "insufficient" as const, isMock: false, companiesInRamo: 0, categories: [] };
  const rows = (await fetchIndustryRows(companyIds)).filter((row) =>
    Number(row.unique_clients) >= 3 &&
    ((Number(row.total_quantity) || 0) > 0 || (Number(row.total_revenue) || 0) > 0),
  );
  if (rows.length === 0) return { dataStatus: "insufficient" as const, isMock: false, companiesInRamo: companyIds.length, categories: [] };
  return {
    dataStatus: "available" as const,
    isMock: false,
    companiesInRamo: Math.max(...rows.map((row) => Number(row.unique_clients) || 0)),
    categories: aggregateIndustryRows(rows),
  };
}

export function useIndustryCategoryTrends(ramoAtividade?: string | null) {
  const query = useQuery<IndustryCategoryTrendsResult>({
    queryKey: ["bi-industry-category-trends", ramoAtividade],
    enabled: !!ramoAtividade,
    staleTime: 10 * 60 * 1000,
    queryFn: () => fetchIndustryCategoryTrends(ramoAtividade),
  });

  const result = query.data ?? {
    dataStatus: query.isError ? "unavailable" as const : "insufficient" as const,
    isMock: false,
    companiesInRamo: 0,
    categories: [] as IndustryCategoryAggregate[],
  };
  return { ...result, dataStatus: query.isError ? "unavailable" as const : result.dataStatus, isLoading: query.isLoading, isError: query.isError };
}
