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
  /** `null` = o RPC devolve agregado de 90 dias, sem série temporal: não há variação medida. */
  trend: "up" | "stable" | "down" | null;
}

export interface IndustryTrendsResult {
  isMock: boolean;
  companiesInRamo: number;
  /** Amostra setorial insuficiente (`companiesInRamo` abaixo do mínimo) não vira tendência. */
  dataStatus: "insufficient" | "available";
  trends: IndustryTrendItem[];
}

/**
 * Abaixo disso o "setor" é uma empresa ou duas com orçamento: não é mercado.
 * O RPC conta empresas com orçamento (sent/viewed/approved/converted/pending),
 * ou seja demanda, não compra fechada — por isso a UI fala em "com orçamento".
 */
const MIN_SECTOR_COMPANIES = 3;

/**
 * Linhas pedidas ao RPC. A elegibilidade (`unique_clients >= MIN_SECTOR_COMPANIES`) é aplicada aqui,
 * depois do `ORDER BY total_quantity DESC LIMIT` do banco: com um teto curto, produto elegível que cai
 * depois do corte some da tela e o setor aparece como "amostra insuficiente". O corte definitivo tem de
 * filtrar dentro do RPC (migration); até lá o teto local é folgado.
 */
const RPC_ROW_LIMIT = 1000;

/** Teto do ranking, aplicado depois do filtro de amostra. */
const MAX_TRENDS = 10;

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
          dataStatus: "available",
          companiesInRamo: 24,
          trends: getMockIndustryTrends(ramoAtividade).map(mockToItem),
        };
      }
      if (!ramoAtividade) {
        return { isMock: false, companiesInRamo: 0, dataStatus: "insufficient", trends: [] };
      }

      // 1) Buscar empresas do mesmo ramo no CRM
      // `selectCrm` generico e negado para vendedor e agente pela politica do portal;
      // `fetchIndustryPeerIds` usa o contrato fechado, que devolve so os ids do ramo.
      // A falha do CRM nao pode virar "setor sem tendencia": sem propagar, o
      // resultado vazio ficaria em cache por 10 min e o copiloto responderia
      // sobre um setor que nenhuma consulta mediu.
      const peerIds = await fetchIndustryPeerIds(ramoAtividade);
      const companyIds = peerIds.filter(Boolean);

      if (companyIds.length > 0 && companyIds.length < MIN_SECTOR_COMPANIES) {
        return { isMock: false, companiesInRamo: companyIds.length, dataStatus: "insufficient", trends: [] };
      }

      // 2) Se temos IDs, tenta RPC
      if (companyIds.length > 0) {
        const { data, error } = await supabase.rpc("get_industry_top_products", {
          _company_ids: companyIds,
          _days: 90,
          _limit: RPC_ROW_LIMIT,
        });

        // O erro deixa de virar lista vazia que cai no mock: o setor passava a
        // ter "tendências" que ninguém mediu.
        if (error) throw error;
        const real = (Array.isArray(data) ? data : []) as IndustryTopProduct[];
        // Produto comprado por uma ou duas empresas é compra isolada, não tendência setorial.
        const sample = real
          .filter((p) => (Number(p.unique_clients) || 0) >= MIN_SECTOR_COMPANIES)
          .slice(0, MAX_TRENDS);
        if (sample.length > 0) {
          return {
            isMock: false,
            dataStatus: "available",
            companiesInRamo: companyIds.length,
            trends: sample.map((p) => ({
              productName: p.product_name,
              productId: p.product_id,
              imageUrl: p.product_image_url,
              category: deriveCategory(p.product_name),
              unitsSold: Number(p.total_quantity) || 0,
              ordersCount: Number(p.unique_clients) || 0,
              avgPrice: Number(p.avg_unit_price) || 0,
              trend: null,
            })),
          };
        }
      }

      return {
        isMock: false,
        companiesInRamo: companyIds.length,
        dataStatus: "insufficient",
        trends: [],
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}
