/**
 * useIndustryCategoryTrends — agrega top produtos do setor por CATEGORIA.
 *
 * Reaproveita o RPC `get_industry_top_products` (já usado em useIndustryTrends)
 * e dobra o resultado por categoria. Quando vazio, preserva a ausência de
 * amostra em vez de produzir categoria fictícia do setor: o conjunto simulado
 * é só do cliente de demonstração.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchIndustryPeerIds } from "@/lib/crm-db";
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

/** Conjunto simulado, exclusivo do cliente de demonstração. */
function buildDemoResult(ramo?: string | null): IndustryCategoryTrendsResult {
  const trends = getMockIndustryTrends(ramo);
  const byCat = new Map<string, IndustryCategoryAggregate>();
  for (const t of trends) {
    const meta = resolveBICategory(t.productName, t.category);
    const key = meta.slug;
    const cur = byCat.get(key) ?? {
      slug: meta.slug,
      label: meta.label,
      totalQuantity: 0,
      uniqueClients: 0,
      totalRevenue: 0,
      revenueSharePct: 0,
      topProducts: [],
    };
    cur.totalQuantity += t.unitsSold;
    cur.uniqueClients += t.ordersCount;
    cur.totalRevenue += t.unitsSold * t.avgPrice;
    cur.topProducts.push({
      productId: null,
      productName: t.productName,
      imageUrl: null,
      quantity: t.unitsSold,
      revenue: t.unitsSold * t.avgPrice,
      avgPrice: t.avgPrice,
    });
    byCat.set(key, cur);
  }
  const totalRev = Array.from(byCat.values()).reduce((s, c) => s + c.totalRevenue, 0) || 1;
  const categories = Array.from(byCat.values())
    .map((c) => ({
      ...c,
      revenueSharePct: (c.totalRevenue / totalRev) * 100,
      topProducts: c.topProducts.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
  return { isMock: true, companiesInRamo: 0, categories };
}

async function fetchCompanyIds(ramoAtividade: string) {
  // `selectCrm` generico e negado para vendedor e agente pela politica do portal;
  // `fetchIndustryPeerIds` usa o contrato fechado, que devolve so os ids do ramo.
  // A falha do CRM nao e "setor sem pares": propagar e o que marca `isError` e
  // libera o aviso de fonte indisponivel com "Tentar novamente" na tela.
  const peerIds = await fetchIndustryPeerIds(ramoAtividade);
  return peerIds.filter(Boolean);
}

async function fetchIndustryRows(companyIds: string[]) {
  const { data, error } = await supabase.rpc("get_industry_top_products", {
    _company_ids: companyIds,
    _days: 90,
    _limit: 50,
  });
  // Erro da RPC tambem nao e setor sem linha medida.
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

function vazio(companiesInRamo = 0): IndustryCategoryTrendsResult {
  return { isMock: false, companiesInRamo, categories: [] };
}

async function fetchIndustryCategoryTrends(
  ramoAtividade: string | null | undefined,
  demo: boolean,
): Promise<IndustryCategoryTrendsResult> {
  if (demo) return buildDemoResult(ramoAtividade);
  if (!ramoAtividade) return vazio();
  const companyIds = await fetchCompanyIds(ramoAtividade);
  if (companyIds.length === 0) return vazio();
  const rows = await fetchIndustryRows(companyIds);
  // Setor sem linha medida fica vazio e identificado: antes caía no mock e a
  // tela comparava o cliente contra categorias inventadas do "setor dele".
  if (rows.length === 0) return vazio(companyIds.length);
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
    queryFn: () => fetchIndustryCategoryTrends(ramoAtividade, demo),
  });

  const resultado = useMemo(() => query.data ?? vazio(), [query.data]);
  return {
    ...resultado,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
