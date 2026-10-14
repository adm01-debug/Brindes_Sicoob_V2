/**
 * useIndustryCategoryTrends — agrega top produtos do setor por CATEGORIA.
 *
 * Reaproveita o RPC `get_industry_top_products` (já usado em useIndustryTrends)
 * e dobra o resultado por categoria. Quando vazio, preserva a ausência de
 * amostra sem produzir categorias fictícias.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { selectCrm } from "@/lib/crm-db";
import { resolveBICategory, type BICategorySlug } from "@/lib/bi/categoryResolver";
import { isDemoClient } from "@/lib/bi/demoClient";
import { getMockIndustryTrends } from "@/lib/bi/mockData";

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

function emptyIndustryResult(companiesInRamo = 0): IndustryCategoryTrendsResult {
  return { isMock: false, companiesInRamo, categories: [] };
}

function buildDemoResult(ramoAtividade?: string | null): IndustryCategoryTrendsResult {
  const rows: IndustryRow[] = getMockIndustryTrends(ramoAtividade).map((trend) => ({
    product_id: null,
    product_name: trend.productName,
    product_image_url: null,
    total_quantity: trend.unitsSold,
    unique_clients: trend.ordersCount,
    total_revenue: trend.unitsSold * trend.avgPrice,
    avg_unit_price: trend.avgPrice,
  }));
  return { isMock: true, companiesInRamo: 24, categories: aggregateIndustryRows(rows) };
}

async function fetchCompanyIds(ramoAtividade: string) {
  try {
    const companies = await selectCrm<{ id: string }>("companies", {
      select: "id",
      filters: { ramo_atividade: ramoAtividade, deleted_at: null },
      limit: 500,
    });
    return companies.map((company) => company.id).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchIndustryRows(companyIds: string[]) {
  const { data, error } = await supabase.rpc("get_industry_top_products", {
    _company_ids: companyIds,
    _days: 90,
    _limit: 50,
  });
  if (error || !Array.isArray(data)) return [];
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
  if (!ramoAtividade) return emptyIndustryResult();
  const companyIds = await fetchCompanyIds(ramoAtividade);
  if (companyIds.length === 0) return emptyIndustryResult();
  const rows = await fetchIndustryRows(companyIds);
  if (rows.length === 0) return emptyIndustryResult(companyIds.length);
  return {
    isMock: false,
    companiesInRamo: companyIds.length,
    categories: aggregateIndustryRows(rows),
  };
}

export function useIndustryCategoryTrends(ramoAtividade?: string | null, clientId?: string | null) {
  const demo = isDemoClient(clientId);
  const query = useQuery<IndustryCategoryTrendsResult>({
    queryKey: ["bi-industry-category-trends", ramoAtividade, demo],
    enabled: !!ramoAtividade || demo,
    staleTime: 10 * 60 * 1000,
    queryFn: () => demo ? buildDemoResult(ramoAtividade) : fetchIndustryCategoryTrends(ramoAtividade),
  });

  const result = useMemo(
    () => query.data ?? (demo ? buildDemoResult(ramoAtividade) : emptyIndustryResult()),
    [demo, query.data, ramoAtividade],
  );
  return { ...result, isLoading: query.isLoading };
}
