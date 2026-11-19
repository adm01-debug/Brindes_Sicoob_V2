/**
 * useClientVsIndustry — compara métricas do cliente com a média do seu ramo.
 * Resolve company IDs do mesmo ramo (excluindo o próprio), chama RPC de benchmark,
 * calcula deltas e classificação. Fallback mock quando amostra insuficiente.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchIndustryPeerIds } from "@/lib/crm-db";
import { useClientBI } from "@/hooks/bi/useClientBI";
import { isDemoClient } from "@/lib/bi/demoClient";

export type ComparisonClassification = "above" | "on_par" | "below" | "no_data";

export interface MetricComparison {
  label: string;
  clientValue: number;
  industryAvg: number;
  deltaPercent: number;
  classification: ComparisonClassification;
  format: "currency" | "number";
}

export interface ClientVsIndustryResult {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  /** Verdadeiro só para o cliente de demonstração — nunca para cliente real sem histórico. */
  isMock: boolean;
  /** O lado do cliente tem pedido medido. */
  hasClientData: boolean;
  /** A consulta do lado do cliente falhou: não é "cliente sem compras". */
  isClientDataUnavailable: boolean;
  hasEnoughSample: boolean;
  sampleSize: number;
  daysWindow: number;
  metrics: MetricComparison[];
  insight: string | null;
}

const THRESHOLD = 15; // ±15% = "na média"
const MIN_SAMPLE = 3;
const DAYS_WINDOW = 180;

function classify(deltaPct: number): ComparisonClassification {
  if (Math.abs(deltaPct) <= THRESHOLD) return "on_par";
  return deltaPct > 0 ? "above" : "below";
}

function pctDelta(client: number, industry: number): number {
  if (!industry || industry <= 0) return 0;
  return ((client - industry) / industry) * 100;
}

function metricMatches(
  metric: MetricComparison | undefined,
  classification: ComparisonClassification,
  minimumDelta: number,
): boolean {
  if (!metric || metric.classification !== classification) return false;
  return classification === "below"
    ? metric.deltaPercent <= -minimumDelta
    : metric.deltaPercent >= minimumDelta;
}

function roundedDelta(metric: MetricComparison | undefined) {
  return Math.round(metric?.deltaPercent ?? 0);
}

function buildInsight(metrics: MetricComparison[]): string | null {
  const ticket = metrics.find((m) => m.label === "Ticket médio");
  const ltv = metrics.find((m) => m.label === "LTV");
  const freq = metrics.find((m) => m.label === "Frequência (pedidos)");

  if (metricMatches(ticket, "above", 25)) {
    return `Este cliente compra ${roundedDelta(ticket)}% mais por pedido que a média do setor — bom alvo para upsell premium.`;
  }
  if (metricMatches(ltv, "below", 25)) {
    return `LTV ${Math.abs(roundedDelta(ltv))}% abaixo da média do ramo — potencial de crescimento via cross-sell.`;
  }
  if (metricMatches(freq, "above", 30)) {
    return `Cliente compra ${roundedDelta(freq)}% mais frequentemente que o setor — cultive a recorrência com programas de fidelidade.`;
  }
  if (metricMatches(freq, "below", 30)) {
    return `Frequência ${Math.abs(roundedDelta(freq))}% abaixo do setor — oportunidade clara de reativação.`;
  }
  const allOnPar = metrics.every((m) => m.classification === "on_par" || m.classification === "no_data");
  if (allOnPar) {
    return "Cliente alinhado à média do setor em todas as métricas — performance saudável e estável.";
  }
  return null;
}

function comparisonMetric(
  label: string,
  clientValue: number,
  industryAvg: number,
  format: MetricComparison["format"],
): MetricComparison {
  const deltaPercent = pctDelta(clientValue, industryAvg);
  return { label, clientValue, industryAvg, deltaPercent, classification: classify(deltaPercent), format };
}

function averageItems(orders: Array<{ itemsCount?: number }>) {
  if (orders.length === 0) return 0;
  return orders.reduce((sum, order) => sum + (order.itemsCount ?? 1), 0) / orders.length;
}

interface BenchmarkRow {
  total_clients_sampled: number;
  avg_ltv: number;
  avg_ticket: number;
  avg_quotes_per_client: number;
  avg_items_per_quote: number;
  top_product_name: string | null;
  total_revenue: number;
}

/** Benchmark do ramo. Extraído do hook para manter a complexidade dentro do gate. */
async function fetchIndustryBenchmark(
  clientId: string | null | undefined,
  ramoAtividade: string | null | undefined,
): Promise<{ rows: BenchmarkRow[]; sampleSize: number }> {
  if (!ramoAtividade) return { rows: [], sampleSize: 0 };
  // Demo: retorna benchmark mockado plausível
  if (isDemoClient(clientId)) {
    const mockRow: BenchmarkRow = {
      total_clients_sampled: 24,
      avg_ltv: 38500,
      avg_ticket: 2850,
      avg_quotes_per_client: 11,
      avg_items_per_quote: 2.4,
      top_product_name: "Garrafa Térmica Inox 500ml",
      total_revenue: 924000,
    };
    return { rows: [mockRow], sampleSize: 24 };
  }

  // 1) Resolver IDs de empresas do mesmo ramo, excluindo o próprio cliente.
  // `selectCrm` genérico é negado para vendedor e agente pela política do
  // portal; `fetchIndustryPeerIds` usa o contrato fechado, que devolve só os
  // ids do ramo. O benchmark continua medido contra o universo do ramo, não
  // apenas contra a carteira — o contrato não aplica `is_customer` aqui.
  const peerIds = await fetchIndustryPeerIds(ramoAtividade);
  const ids = peerIds.filter((id) => id && id !== clientId);
  if (ids.length === 0) return { rows: [], sampleSize: 0 };

  const { data, error } = await supabase.rpc("get_industry_benchmark_stats", {
    _company_ids: ids,
    _days: DAYS_WINDOW,
  });
  if (error) throw error;
  return { rows: (data ?? []) as BenchmarkRow[], sampleSize: ids.length };
}

type ClientBiResult = ReturnType<typeof useClientBI>;
type EstadoDeOrigem = Pick<
  ClientVsIndustryResult,
  "isError" | "error" | "refetch" | "isMock" | "hasClientData" | "isClientDataUnavailable"
>;

/**
 * Comparativo propriamente dito, fora do hook: o gate de complexidade do
 * projeto é 10, e juntar origem do dado, amostra e métricas numa função só
 * passava disso.
 */
function montarComparativo(
  estado: EstadoDeOrigem,
  clientBI: ClientBiResult,
  fonte: { benchmark: BenchmarkRow | undefined; sampleSize: number; isLoading: boolean },
): ClientVsIndustryResult {
  const { benchmark, sampleSize, isLoading } = fonte;
  const amostraFechada = !!benchmark && sampleSize >= MIN_SAMPLE;
  const base = { ...estado, isLoading, sampleSize, daysWindow: DAYS_WINDOW };

  if (!benchmark || !amostraFechada || !clientBI.hasData) {
    return { ...base, hasEnoughSample: amostraFechada, metrics: [], insight: null };
  }

  // Estimativa: itens/orçamento do cliente — sem RPC dedicada, derivamos de recentOrders
  const metrics: MetricComparison[] = [
    comparisonMetric("LTV", clientBI.ltv, Number(benchmark.avg_ltv), "currency"),
    comparisonMetric("Ticket médio", clientBI.avgTicket, Number(benchmark.avg_ticket), "currency"),
    comparisonMetric("Frequência (pedidos)", clientBI.ordersCount, Number(benchmark.avg_quotes_per_client), "number"),
    comparisonMetric("Itens por orçamento", averageItems(clientBI.recentOrders), Number(benchmark.avg_items_per_quote), "number"),
  ];
  return { ...base, hasEnoughSample: true, metrics, insight: buildInsight(metrics) };
}

export function useClientVsIndustry(
  clientId: string | null | undefined,
  ramoAtividade: string | null | undefined,
): ClientVsIndustryResult {
  const demo = isDemoClient(clientId);
  const clientBI = useClientBI(clientId ?? undefined);

  const benchmarkQuery = useQuery({
    queryKey: ["bi", "industry-benchmark", ramoAtividade, clientId],
    enabled: !!ramoAtividade && !!clientId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchIndustryBenchmark(clientId, ramoAtividade),
  });

  const benchmark = benchmarkQuery.data?.rows?.[0];
  // A falha vem dos dois lados: histórico do cliente e benchmark do setor.
  // `isMock` era `true` sempre que a amostra não fechava, o que fazia a tela
  // chamar de simulado um benchmark que simplesmente não existia. Simulado é
  // só o cliente de demonstração.
  const estado: EstadoDeOrigem = {
    isError: clientBI.isUnavailable || benchmarkQuery.isError,
    error: benchmarkQuery.error ?? clientBI.error,
    refetch: async () => Promise.all([clientBI.refetch(), benchmarkQuery.refetch()]),
    isMock: demo,
    hasClientData: clientBI.hasData,
    isClientDataUnavailable: clientBI.isUnavailable,
  };

  return montarComparativo(estado, clientBI, {
    benchmark,
    sampleSize: Number(benchmark?.total_clients_sampled ?? 0),
    isLoading: clientBI.isLoading || benchmarkQuery.isLoading,
  });
}
