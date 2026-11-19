/**
 * useIndustryTrends — top produtos vendidos para empresas do mesmo ramo.
 * Estratégia:
 * 1) Busca IDs de companies (CRM externo) com mesmo ramo_atividade
 * 2) Chama RPC get_industry_top_products(_company_ids, _days)
 * 3) Se a amostra estiver vazia, devolve estado vazio explícito: o conjunto
 *    simulado é só do cliente de demonstração
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchIndustryPeerIds } from "@/lib/crm-db";
import { isDemoClient } from "@/lib/bi/demoClient";
import { getMockIndustryTrends, type MockIndustryTrend } from "@/lib/bi/mockData";

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

function mockToItem(m: MockIndustryTrend): IndustryTrendItem {
  return {
    productName: m.productName,
    category: m.category,
    unitsSold: m.unitsSold,
    ordersCount: m.ordersCount,
    avgPrice: m.avgPrice,
    trend: m.trend,
  };
}

export function useIndustryTrends(ramoAtividade?: string | null, clientId?: string | null) {
  const demo = isDemoClient(clientId);
  return useQuery<IndustryTrendsResult>({
    queryKey: ["bi-industry-trends-v2", ramoAtividade, demo],
    enabled: !!ramoAtividade || demo,
    queryFn: async () => {
      if (demo) {
        return {
          isMock: true,
          companiesInRamo: 24,
          trends: getMockIndustryTrends(ramoAtividade).map(mockToItem),
        };
      }
      if (!ramoAtividade) {
        return { isMock: false, companiesInRamo: 0, trends: [] };
      }

      // 1) Buscar empresas do mesmo ramo no CRM
      // `selectCrm` generico e negado para vendedor e agente pela politica do portal;
      // `fetchIndustryPeerIds` usa o contrato fechado, que devolve so os ids do ramo.
      // A falha do CRM nao pode virar "setor sem tendencia": sem propagar, o
      // resultado vazio ficaria em cache por 10 min e o copiloto responderia
      // sobre um setor que nenhuma consulta mediu.
      const peerIds = await fetchIndustryPeerIds(ramoAtividade);
      const companyIds = peerIds.filter(Boolean);

      // 2) Se temos IDs, tenta RPC
      if (companyIds.length > 0) {
        const { data, error } = await supabase.rpc("get_industry_top_products", {
          _company_ids: companyIds,
          _days: 90,
          _limit: 10,
        });

        // O erro deixa de virar lista vazia que cai no mock: o setor passava a
        // ter "tendências" que ninguém mediu.
        if (error) throw error;
        const real = (Array.isArray(data) ? data : []) as IndustryTopProduct[];
        if (real.length > 0) {
          return {
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
        isMock: false,
        companiesInRamo: companyIds.length,
        trends: [],
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}
