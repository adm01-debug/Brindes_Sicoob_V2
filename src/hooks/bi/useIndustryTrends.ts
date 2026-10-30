/**
 * useIndustryTrends — top produtos vendidos para empresas do mesmo ramo.
 * Estratégia:
 * 1) Busca IDs de companies (CRM externo) com mesmo ramo_atividade
 * 2) Chama RPC get_industry_top_products(_company_ids, _days)
 * 3) Se RPC vazia → amostra insuficiente, sem dados demonstrativos
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { selectCrm } from "@/lib/crm-db";

export interface IndustryTopProduct {
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  total_quantity: number;
  unique_clients: number;
  unique_sellers: number;
  total_revenue: number;
  avg_unit_price: number;
}

export interface IndustryTrendItem {
  productName: string;
  productId?: string | null;
  imageUrl?: string | null;
  category: string;
  unitsSold: number;
  ordersCount: number;
  avgPrice: number;
  trend: "up" | "stable" | "down";
}

export interface IndustryTrendsResult {
  dataStatus: "insufficient" | "available" | "unavailable";
  isMock: boolean;
  companiesInRamo: number;
  trends: IndustryTrendItem[];
}

function deriveCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/garrafa|squeeze|t[eé]rmic/.test(lower)) return "Garrafas";
  if (/caneta|lapiseira/.test(lower)) return "Canetas";
  if (/mochila|bolsa/.test(lower)) return "Mochilas";
  if (/agenda|planner/.test(lower)) return "Agendas";
  if (/power\s*bank|carregador|fone|bluetooth/.test(lower)) return "Eletrônicos";
  if (/bloco/.test(lower)) return "Blocos";
  if (/kit/.test(lower)) return "Kits";
  return "Outros";
}

export function useIndustryTrends(ramoAtividade?: string | null) {
  const query = useQuery<IndustryTrendsResult>({
    queryKey: ["bi-industry-trends-v2", ramoAtividade],
    enabled: !!ramoAtividade,
    queryFn: async () => {
      if (!ramoAtividade) {
        return { dataStatus: "insufficient", isMock: false, companiesInRamo: 0, trends: [] };
      }

      // 1) Buscar empresas do mesmo ramo no CRM
      const companies = await selectCrm<{ id: string }>("companies", {
        select: "id",
        filters: { ramo_atividade: ramoAtividade, deleted_at: null },
        limit: 500,
      });
      const companyIds = companies.map((c) => c.id).filter(Boolean);

      // 2) Se temos IDs, tenta RPC
      if (companyIds.length > 0) {
        const { data, error } = await supabase.rpc("get_industry_top_products", {
          _company_ids: companyIds,
          _days: 90,
          _limit: 10,
        });

        if (error) throw error;
        const real = (Array.isArray(data) ? data : []) as IndustryTopProduct[];
        if (real.length > 0) {
          return {
            dataStatus: "available",
            isMock: false,
            companiesInRamo: companyIds.length,
            trends: real.map((p) => ({
              productName: p.product_name,
              productId: p.product_id,
              imageUrl: p.product_image_url,
              category: deriveCategory(p.product_name),
              unitsSold: Number(p.total_quantity) || 0,
              ordersCount: Number(p.unique_clients) || 0,
              avgPrice: Number(p.avg_unit_price) || 0,
              trend: "stable" as const,
            })),
          };
        }
      }

      return {
        dataStatus: "insufficient",
        isMock: false,
        companiesInRamo: companyIds.length,
        trends: [],
      };
    },
    staleTime: 10 * 60 * 1000,
  });
  if (!query.data) {
    return {
      data: {
        dataStatus: query.isError ? "unavailable" as const : "insufficient" as const,
        isMock: false,
        companiesInRamo: 0,
        trends: [],
      },
      isLoading: query.isLoading,
      isError: query.isError,
    };
  }
  return { ...query, data: query.isError ? { ...query.data, dataStatus: "unavailable" as const, trends: [] } : query.data };
}
