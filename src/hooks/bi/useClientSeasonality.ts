/**
 * useClientSeasonality — sazonalidade Cliente × Setor (12 meses).
 * Combina RPC do cliente + RPC do setor (empresas mesmo ramo).
 * Calcula: distribuição mensal, top 3 picos, próximo pico, insight textual.
 * Amostra insuficiente permanece vazia e identificada: não há fallback
 * fictício em tela operacional. O conjunto simulado é só do cliente de
 * demonstração.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchIndustryPeerIds } from "@/lib/crm-db";
import { isDemoClient } from "@/lib/bi/demoClient";
import { getMockSeasonality } from "@/lib/bi/mockData";

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const MONTH_LABELS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export interface ClientMonthCell {
  month: number; // 1-12
  monthLabel: string;
  quotesCount: number;
  totalRevenue: number;
  avgTicket: number;
  sharePercent: number; // % do total anual do cliente
  intensity: number; // 0..1 normalizado pelo maior mês do cliente
}

export interface IndustryMonthCell {
  month: number;
  monthLabel: string;
  avgQuotesPerCompany: number;
  avgRevenuePerCompany: number;
  sharePercent: number;
  intensity: number;
}

export interface SeasonalityResult {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  /** A consulta do setor falhou sozinha: o lado do cliente continua válido. */
  industryError: unknown;
  isMock: boolean;
  hasEnoughData: boolean;
  /** O cliente tem compras medidas na janela. */
  hasClientData: boolean;
  /** O setor tem pelo menos `MIN_SECTOR_COMPANIES` empresas com histórico: só aí vira mercado. */
  hasIndustryData: boolean;
  dataStatus: "available" | "insufficient";
  monthsCovered: number;
  windowMonths: number;
  client: ClientMonthCell[]; // sempre 12 posições, Jan→Dez
  industry: IndustryMonthCell[]; // sempre 12 posições
  topClientMonths: ClientMonthCell[]; // top 3
  topIndustryMonths: IndustryMonthCell[]; // top 3
  nextPeakMonth: number | null; // 1-12
  daysToNextPeak: number | null;
  insight: string | null;
}

interface ClientRow {
  year: number;
  month: number;
  quotes_count: number;
  total_revenue: number;
  avg_ticket: number;
}
interface IndustryRow {
  year: number;
  month: number;
  avg_quotes_per_company: number;
  avg_revenue_per_company: number;
  companies_active: number;
}

const WINDOW_MONTHS = 24;
/**
 * Empresas do ramo com histórico mínimo para o setor virar comparação de mercado.
 * Abaixo disso a média é de uma ou duas empresas, não do setor: a tela chamava
 * isso de sazonalidade do mercado.
 */
const MIN_SECTOR_COMPANIES = 3;

interface ClientAccumulator {
  q: number;
  r: number;
  t: number;
  n: number;
}

function clientMonthCell(
  month: number,
  value: ClientAccumulator | undefined,
  totalQuotes: number,
  maxQuotes: number,
): ClientMonthCell {
  const quotes = value?.q ?? 0;
  return {
    month,
    monthLabel: MONTH_LABELS[month - 1] ?? String(month),
    quotesCount: quotes,
    totalRevenue: value?.r ?? 0,
    avgTicket: value && value.n > 0 ? value.t / value.n : 0,
    sharePercent: totalQuotes > 0 ? (quotes / totalQuotes) * 100 : 0,
    intensity: maxQuotes > 0 ? quotes / maxQuotes : 0,
  };
}

function buildClientCells(rows: ClientRow[]): {
  cells: ClientMonthCell[];
  monthsCovered: number;
} {
  // Acumula por mês (1..12) somando os 24 meses
  const acc: Record<number, ClientAccumulator> = {};
  const monthsSet = new Set<string>();
  for (const r of rows) {
    monthsSet.add(`${r.year}-${r.month}`);
    const m = r.month;
    if (!acc[m]) acc[m] = { q: 0, r: 0, t: 0, n: 0 };
    acc[m].q += Number(r.quotes_count) || 0;
    acc[m].r += Number(r.total_revenue) || 0;
    acc[m].t += Number(r.avg_ticket) || 0;
    acc[m].n += 1;
  }
  const totalQuotes = Object.values(acc).reduce((s, v) => s + v.q, 0);
  const maxQuotes = Math.max(0, ...Object.values(acc).map((v) => v.q));

  const cells: ClientMonthCell[] = [];
  for (let m = 1; m <= 12; m++) {
    cells.push(clientMonthCell(m, acc[m], totalQuotes, maxQuotes));
  }
  return { cells, monthsCovered: monthsSet.size };
}

/** `companies_active` é quantas empresas têm histórico naquele mês. */
function hasIndustrySample(row: IndustryRow): boolean {
  return (Number(row.companies_active) || 0) >= MIN_SECTOR_COMPANIES;
}

type IndustryMonthAcc = { q: number; r: number; n: number };

/**
 * Soma as médias mês a mês. Um mês com uma empresa só faz a compra de um
 * cliente virar "sazonalidade do setor"; esses meses ficam fora da amostra.
 */
function accumulateIndustryMonths(
  rows: IndustryRow[],
): Record<number, IndustryMonthAcc> {
  const acc: Record<number, IndustryMonthAcc> = {};
  for (const r of rows) {
    if (!hasIndustrySample(r)) continue;
    const m = r.month;
    if (!acc[m]) acc[m] = { q: 0, r: 0, n: 0 };
    acc[m].q += Number(r.avg_quotes_per_company) || 0;
    acc[m].r += Number(r.avg_revenue_per_company) || 0;
    acc[m].n += 1;
  }
  return acc;
}

function buildIndustryCells(rows: IndustryRow[]): {
  cells: IndustryMonthCell[];
  hasSample: boolean;
} {
  const acc = accumulateIndustryMonths(rows);
  // Média sobre os anos cobertos
  const monthly: Record<number, { q: number; r: number }> = {};
  for (let m = 1; m <= 12; m++) {
    const v = acc[m];
    monthly[m] = v && v.n > 0 ? { q: v.q / v.n, r: v.r / v.n } : { q: 0, r: 0 };
  }
  const totalQ = Object.values(monthly).reduce((s, v) => s + v.q, 0);
  const maxQ = Math.max(0, ...Object.values(monthly).map((v) => v.q));

  const cells: IndustryMonthCell[] = [];
  for (let m = 1; m <= 12; m++) {
    cells.push(industryMonthCell(m, monthly[m] ?? { q: 0, r: 0 }, totalQ, maxQ));
  }
  return { cells, hasSample: Object.keys(acc).length > 0 };
}

function industryMonthCell(
  month: number,
  value: { q: number; r: number },
  totalQuotes: number,
  maxQuotes: number,
): IndustryMonthCell {
  return {
    month,
    monthLabel: MONTH_LABELS[month - 1] ?? String(month),
    avgQuotesPerCompany: value.q,
    avgRevenuePerCompany: value.r,
    sharePercent: totalQuotes > 0 ? (value.q / totalQuotes) * 100 : 0,
    intensity: maxQuotes > 0 ? value.q / maxQuotes : 0,
  };
}

function hasClientActivity(cells: ClientMonthCell[]): boolean {
  return cells.some((c) => c.quotesCount > 0);
}

function resolveDataStatus(hasClientData: boolean, hasIndustryData: boolean): SeasonalityResult["dataStatus"] {
  if (hasClientData && hasIndustryData) return "available";
  return "insufficient";
}

/**
 * Setor só vira comparação de mercado com amostra mínima de empresas **com
 * histórico**. O gate era `companiesCount` (cadastros do ramo): três cadastros e
 * um único comprador bastavam para o histórico desse comprador ser apresentado
 * como sazonalidade setorial.
 */
function resolveIndustrySample(
  rows: IndustryRow[] | undefined,
): { industry: IndustryMonthCell[]; hasIndustryData: boolean } {
  const measured = buildIndustryCells(rows ?? []);
  if (!measured.hasSample || !measured.cells.some((c) => c.avgQuotesPerCompany > 0))
    return { industry: zeroIndustryCells(), hasIndustryData: false };
  return { industry: measured.cells, hasIndustryData: true };
}

function zeroIndustryCells(): IndustryMonthCell[] {
  return Array.from({ length: 12 }, (_, i) => industryMonthCell(i + 1, { q: 0, r: 0 }, 0, 0));
}

function peakResult(
  client: ClientMonthCell[],
  industry: IndustryMonthCell[],
  base: Omit<
    SeasonalityResult,
    "client" | "industry" | "topClientMonths" | "topIndustryMonths" | "nextPeakMonth"
    | "daysToNextPeak" | "insight" | "isError" | "error" | "refetch"
  >,
): Omit<SeasonalityResult, "isError" | "error" | "refetch"> {
  const topClient = pickTop(client, "quotesCount", 3);
  const topIndustry = pickTop(industry, "avgQuotesPerCompany", 3);
  const nextPeak = findNextPeak(topClient);
  return {
    ...base,
    client,
    industry,
    topClientMonths: topClient,
    topIndustryMonths: topIndustry,
    nextPeakMonth: nextPeak?.month ?? null,
    daysToNextPeak: nextPeak?.days ?? null,
    insight: buildInsight(topClient, topIndustry, nextPeak),
  };
}

/**
 * Amostra curta não vira pico inventado.
 *
 * Antes, menos de 3 meses de histórico devolvia `getMockSeasonality()` — picos,
 * meses e insight de um cliente fictício — e um setor todo zerado era
 * substituído pelo setor do mock. O mapa de calor afirmava sazonalidade que
 * ninguém mediu. Agora a amostra curta devolve o que existe, vazio e marcado
 * com `hasEnoughData: false`; simulado é só o cliente de demonstração.
 */
export function resolveSeasonalityResult(
  data: { clientRows: ClientRow[]; industryRows: IndustryRow[]; industryError?: unknown } | undefined,
  isLoading: boolean,
  useDemoData = false,
) {
  if (useDemoData) {
    const demo = getMockSeasonality();
    return peakResult(demo.client, demo.industry, {
      isLoading: false,
      isMock: true,
      hasEnoughData: true,
      hasClientData: true,
      hasIndustryData: true,
      dataStatus: "available",
      monthsCovered: WINDOW_MONTHS,
      windowMonths: WINDOW_MONTHS,
      industryError: undefined,
    });
  }

  const { cells: client, monthsCovered } = buildClientCells(data?.clientRows ?? []);
  const hasClientData = hasClientActivity(client);
  const { industry, hasIndustryData } = resolveIndustrySample(data?.industryRows);
  const base = {
    isLoading,
    monthsCovered,
    windowMonths: WINDOW_MONTHS,
    industryError: data?.industryError,
    hasClientData,
    hasIndustryData,
    dataStatus: resolveDataStatus(hasClientData, hasIndustryData),
  };
  if (monthsCovered < 3) {
    return {
      ...base,
      isMock: false,
      hasEnoughData: false,
      client,
      industry,
      topClientMonths: [],
      topIndustryMonths: [],
      nextPeakMonth: null,
      daysToNextPeak: null,
      insight: null,
    };
  }
  return peakResult(client, industry, { ...base, isMock: false, hasEnoughData: true });
}

function pickTop<T extends { quotesCount?: number; avgQuotesPerCompany?: number }>(
  cells: T[],
  key: "quotesCount" | "avgQuotesPerCompany",
  n = 3,
): T[] {
  return [...cells]
    .filter((c) => (c[key] as number) > 0)
    .sort((a, b) => (b[key] as number) - (a[key] as number))
    .slice(0, n);
}

function findNextPeak(
  topClient: ClientMonthCell[],
): { month: number; days: number } | null {
  if (topClient.length === 0) return null;
  const today = new Date();
  const peakMonths = new Set(topClient.map((c) => c.month));
  // procura nos próximos 12 meses
  for (let i = 0; i < 12; i++) {
    const candidate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthNum = candidate.getMonth() + 1;
    if (peakMonths.has(monthNum)) {
      // se for o mês atual, distância = 0; senão diff até dia 1 do mês candidato
      const diffMs = candidate.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const days = Math.max(0, Math.round(diffMs / 86400000));
      return { month: monthNum, days };
    }
  }
  return null;
}

function buildInsight(
  topClient: ClientMonthCell[],
  topIndustry: IndustryMonthCell[],
  nextPeak: { month: number; days: number } | null,
): string | null {
  if (topClient.length === 0) return null;
  const top3Share = topClient.reduce((s, c) => s + c.sharePercent, 0);
  const top3Names = topClient
    .map((c) => MONTH_LABELS[c.month - 1])
    .join("-");

  const peakAlignsWithIndustry =
    topClient.length > 0 &&
    topIndustry.length > 0 &&
    topClient.some((c) => topIndustry.some((i) => i.month === c.month));

  let base = `Cliente concentra ${Math.round(top3Share)}% das compras em ${top3Names}.`;

  if (nextPeak) {
    if (nextPeak.days === 0) {
      base += ` Estamos no mês de pico — momento ideal para abordagem agora.`;
    } else if (nextPeak.days <= 30) {
      base += ` Próximo pico em ${nextPeak.days} dias (${MONTH_LABELS_FULL[nextPeak.month - 1]}) — momento ideal para prospecção.`;
    } else {
      base += ` Próximo pico em ${MONTH_LABELS_FULL[nextPeak.month - 1]} (${nextPeak.days} dias).`;
    }
  }

  if (peakAlignsWithIndustry) {
    base += " Padrão alinhado com a sazonalidade do setor.";
  } else if (topIndustry.length > 0) {
    base += ` Setor concentra em ${topIndustry.map((i) => MONTH_LABELS[i.month - 1]).join("-")} — padrão diferente do mercado.`;
  }

  return base;
}

export function useClientSeasonality(
  clientId: string | null | undefined,
  ramoAtividade: string | null | undefined,
): SeasonalityResult {
  const demo = isDemoClient(clientId);
  const query = useQuery({
    queryKey: ["bi", "seasonality", clientId, ramoAtividade, demo],
    enabled: !!clientId && !demo,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!clientId) throw new Error("Cliente não identificado");
      // 1) Sazonalidade do cliente
      const { data: clientData, error: clientErr } = await supabase.rpc(
        "get_client_seasonality",
        { _client_id: clientId, _months: WINDOW_MONTHS },
      );
      if (clientErr) throw clientErr;
      const clientRows = (clientData ?? []) as ClientRow[];

      // 2) Sazonalidade do setor (se houver ramo)
      let industryRows: IndustryRow[] = [];
      // A falha do setor passa a ser devolvida, não engolida: sem isso a tela
      // não tinha como distinguir "setor sem dado" de "consulta do setor caiu".
      let industryError: unknown;
      if (ramoAtividade) {
        try {
          // `selectCrm` generico e negado para vendedor e agente pela politica do portal;
          // `fetchIndustryPeerIds` usa o contrato fechado, que devolve so os ids do ramo.
          const peerIds = await fetchIndustryPeerIds(ramoAtividade);
          const ids = peerIds.filter((id) => id && id !== clientId);
          if (ids.length > 0) {
            const { data: indData, error: indErr } = await supabase.rpc(
              "get_industry_seasonality",
              { _company_ids: ids, _months: WINDOW_MONTHS },
            );
            if (indErr) throw indErr;
            industryRows = (indData ?? []) as IndustryRow[];
          }
        } catch (error) {
          industryError = error;
        }
      }

      return { clientRows, industryRows, industryError };
    },
  });

  return {
    ...resolveSeasonalityResult(query.data, query.isLoading, demo),
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export const SEASONALITY_MONTH_LABELS = MONTH_LABELS;
export const SEASONALITY_MONTH_LABELS_FULL = MONTH_LABELS_FULL;
