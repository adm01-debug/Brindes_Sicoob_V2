/**
 * useQuotesDashboard — Business logic hook for QuotesDashboardPage.
 * Manages metrics computation, client fetching, token stats, and PDF export.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { selectCrm } from '@/lib/crm-db';
import { useQuotes, type Quote } from '@/hooks/quotes/useQuotes';
import { format, differenceInHours, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAutoTableFinalY } from '@/lib/pdf/auto-table';
import { QUOTE_STATUS_CONFIG } from '@/lib/quote-status-config';

interface Client {
  id: string;
  name: string;
}
interface CrmClientRow {
  id: string;
  nome_fantasia: string | null;
}

const statusConfig = Object.fromEntries(
  Object.entries(QUOTE_STATUS_CONFIG).map(([k, v]) => [k, { label: v.label, color: v.color }]),
) as Record<string, { label: string; color: string }>;

export { statusConfig };

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatResponseTime(hours: number) {
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

type Period = 'month' | 'quarter' | 'year';

const EMPTY_METRICS = {
  totalQuotes: 0,
  totalValue: 0,
  approvedValue: 0,
  approvalRate: 0,
  rejectionRate: 0,
  averageResponseTime: 0,
  averageValue: 0,
  pendingQuotes: 0,
  totalProfit: 0,
  averageMargin: 0,
  statusDistribution: [] as { name: string; value: number; color: string }[],
  monthlyData: [] as {
    month: string;
    total: number;
    approved: number;
    rejected: number;
    value: number;
    profit: number;
  }[],
  conversionFunnel: [] as { stage: string; count: number; fill: string }[],
};

function getPeriodStart(period: Period, now = new Date()) {
  if (period === 'quarter') return subMonths(startOfMonth(now), 2);
  if (period === 'year') return subMonths(startOfMonth(now), 11);
  return startOfMonth(now);
}

function quoteTimestamp(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

function filterDashboardQuotes(quotes: Quote[], period: Period, clientId: string) {
  const startDate = getPeriodStart(period).getTime();
  return quotes.filter((quote) => {
    const isInPeriod = quoteTimestamp(quote.created_at) >= startDate;
    const isSelectedClient = clientId === 'all' || quote.client_id === clientId;
    return isInPeriod && isSelectedClient;
  });
}

function getQuoteCost(quote: Quote) {
  return quote.total_cost || (quote.real_subtotal ? quote.real_subtotal * 0.7 : 0);
}

function calculateAverageResponseTime(quotes: Quote[]) {
  const responded = quotes.filter((quote) => quote.client_response_at && quote.created_at);
  if (responded.length === 0) return 0;
  const total = responded.reduce(
    (sum, quote) =>
      sum +
      differenceInHours(new Date(quote.client_response_at || 0), new Date(quote.created_at || 0)),
    0,
  );
  return total / responded.length;
}

function buildStatusDistribution(quotes: Quote[]) {
  const counts = quotes.reduce<Record<string, number>>((accumulator, quote) => {
    accumulator[quote.status] = (accumulator[quote.status] || 0) + 1;
    return accumulator;
  }, {});
  return Object.entries(counts).map(([status, value]) => ({
    name: statusConfig[status]?.label || status,
    value,
    color: statusConfig[status]?.color || 'hsl(var(--muted))',
  }));
}

function buildMonthlyData(quotes: Quote[]) {
  const groups = quotes.reduce<
    Record<
      string,
      {
        month: string;
        total: number;
        approved: number;
        rejected: number;
        value: number;
        profit: number;
      }
    >
  >((accumulator, quote) => {
    const month = format(new Date(quote.created_at || 0), 'MMM', { locale: ptBR });
    accumulator[month] ||= { month, total: 0, approved: 0, rejected: 0, value: 0, profit: 0 };
    accumulator[month].total += 1;
    if (quote.status === 'approved') {
      accumulator[month].approved += 1;
      accumulator[month].value += quote.total || 0;
      accumulator[month].profit += (quote.total || 0) - getQuoteCost(quote);
    }
    if (quote.status === 'rejected') accumulator[month].rejected += 1;
    return accumulator;
  }, {});
  return Object.values(groups);
}

function calculateDashboardMetrics(quotes: Quote[], period: Period, clientId: string) {
  if (quotes.length === 0) return EMPTY_METRICS;
  const filtered = filterDashboardQuotes(quotes, period, clientId);
  const approved = filtered.filter((quote) => quote.status === 'approved');
  const rejected = filtered.filter((quote) => quote.status === 'rejected');
  const responded = [...approved, ...rejected];
  const totalValue = filtered.reduce((sum, quote) => sum + (quote.total || 0), 0);
  const approvedValue = approved.reduce((sum, quote) => sum + (quote.total || 0), 0);
  const totalProfit = approved.reduce(
    (sum, quote) => sum + (quote.total || 0) - getQuoteCost(quote),
    0,
  );
  const responseCount = responded.length;
  return {
    totalQuotes: filtered.length,
    totalValue,
    approvedValue,
    approvalRate: responseCount > 0 ? (approved.length / responseCount) * 100 : 0,
    rejectionRate: responseCount > 0 ? (rejected.length / responseCount) * 100 : 0,
    averageResponseTime: calculateAverageResponseTime(responded),
    averageValue: filtered.length > 0 ? totalValue / filtered.length : 0,
    totalProfit,
    averageMargin: approvedValue > 0 ? (totalProfit / approvedValue) * 100 : 0,
    pendingQuotes: filtered.filter((quote) => ['pending', 'sent'].includes(quote.status)).length,
    statusDistribution: buildStatusDistribution(filtered),
    monthlyData: buildMonthlyData(filtered),
    conversionFunnel: [
      { stage: 'Criados', count: filtered.length, fill: 'hsl(var(--primary))' },
      {
        stage: 'Enviados',
        count: filtered.filter((quote) => ['sent', 'approved', 'rejected'].includes(quote.status))
          .length,
        fill: 'hsl(var(--info))',
      },
      { stage: 'Respondidos', count: responseCount, fill: 'hsl(var(--warning))' },
      { stage: 'Aprovados', count: approved.length, fill: 'hsl(var(--success))' },
    ],
  };
}

type DashboardMetrics = ReturnType<typeof calculateDashboardMetrics>;
type TokenStats = { total: number; viewed: number; responded: number };

function getPeriodLabel(period: Period) {
  if (period === 'month') return 'Mês Atual';
  if (period === 'quarter') return 'Trimestre';
  return 'Ano';
}

function writeDashboardHeader(doc: jsPDF, period: Period, clientName: string | null, now: Date) {
  doc.setFontSize(18);
  doc.text('Dashboard de Conversão de Orçamentos', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Período: ${getPeriodLabel(period)} • Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    14,
    28,
  );
  if (clientName) doc.text(`Cliente: ${clientName}`, 14, 34);
}

function writeMetricsTable(doc: jsPDF, metrics: DashboardMetrics, clientName: string | null) {
  doc.setTextColor(0);
  autoTable(doc, {
    startY: clientName ? 40 : 34,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Orçamentos', metrics.totalQuotes.toString()],
      ['Pendentes', metrics.pendingQuotes.toString()],
      ['Taxa de Aprovação', `${metrics.approvalRate.toFixed(1)}%`],
      ['Taxa de Rejeição', `${metrics.rejectionRate.toFixed(1)}%`],
      ['Tempo Médio de Resposta', formatResponseTime(metrics.averageResponseTime)],
      ['Valor Total Orçado', formatCurrency(metrics.totalValue)],
      ['Valor Total Aprovado', formatCurrency(metrics.approvedValue)],
      ['Ticket Médio', formatCurrency(metrics.averageValue)],
      ['Lucro Bruto Total', formatCurrency(metrics.totalProfit)],
      ['Margem Média', `${metrics.averageMargin.toFixed(1)}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 10 },
  });
}

function writeDistributionTable(doc: jsPDF, metrics: DashboardMetrics) {
  if (metrics.statusDistribution.length === 0) return;
  const y = getAutoTableFinalY(doc, 80);
  doc.setFontSize(13);
  doc.text('Distribuição por Status', 14, y + 12);
  autoTable(doc, {
    startY: y + 16,
    head: [['Status', 'Quantidade']],
    body: metrics.statusDistribution.map((status) => [status.name, status.value.toString()]),
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 10 },
  });
}

function writeFunnelTable(doc: jsPDF, metrics: DashboardMetrics) {
  if (metrics.conversionFunnel.length === 0) return;
  const y = getAutoTableFinalY(doc, 120);
  doc.setFontSize(13);
  doc.text('Funil de Conversão', 14, y + 12);
  autoTable(doc, {
    startY: y + 16,
    head: [['Etapa', 'Quantidade']],
    body: metrics.conversionFunnel.map((stage) => [stage.stage, stage.count.toString()]),
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 10 },
  });
}

function percentage(part: number, total: number) {
  return total > 0 ? ((part / total) * 100).toFixed(0) : '0';
}

function writeTokenTable(doc: jsPDF, tokenStats: TokenStats) {
  if (tokenStats.total === 0) return;
  const y = getAutoTableFinalY(doc, 160);
  doc.setFontSize(13);
  doc.text('Links de Aprovação', 14, y + 12);
  autoTable(doc, {
    startY: y + 16,
    head: [['Métrica', 'Valor']],
    body: [
      ['Links Enviados', tokenStats.total.toString()],
      [
        'Visualizados',
        `${tokenStats.viewed} (${percentage(tokenStats.viewed, tokenStats.total)}%)`,
      ],
      [
        'Respondidos',
        `${tokenStats.responded} (${percentage(tokenStats.responded, tokenStats.viewed)}%)`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 10 },
  });
}

function getRecentResponses(quotes: Quote[]) {
  return quotes
    .filter((quote) => Boolean(quote.client_response_at))
    .sort(
      (left, right) =>
        quoteTimestamp(right.client_response_at) - quoteTimestamp(left.client_response_at),
    )
    .slice(0, 10);
}

function writeRecentResponses(doc: jsPDF, quotes: Quote[]) {
  const recentResponses = getRecentResponses(quotes);
  if (recentResponses.length === 0) return;
  const y = getAutoTableFinalY(doc, 200);
  if (y > 240) doc.addPage();
  const startY = y > 240 ? 20 : y + 12;
  doc.setFontSize(13);
  doc.text('Últimas Respostas de Clientes', 14, startY);
  autoTable(doc, {
    startY: startY + 4,
    head: [['Orçamento', 'Status', 'Data', 'Valor']],
    body: recentResponses.map((quote) => [
      quote.quote_number || quote.id || '',
      statusConfig[quote.status]?.label || quote.status,
      quote.client_response_at
        ? format(new Date(quote.client_response_at), 'dd/MM/yyyy HH:mm')
        : '-',
      formatCurrency(quote.total || 0),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 9 },
  });
}

function exportDashboardPdf(input: {
  metrics: DashboardMetrics;
  tokenStats: TokenStats;
  quotes: Quote[];
  period: Period;
  clientName: string | null;
}) {
  const doc = new jsPDF();
  const now = new Date();
  writeDashboardHeader(doc, input.period, input.clientName, now);
  writeMetricsTable(doc, input.metrics, input.clientName);
  writeDistributionTable(doc, input.metrics);
  writeFunnelTable(doc, input.metrics);
  writeTokenTable(doc, input.tokenStats);
  writeRecentResponses(doc, input.quotes);
  doc.save(`dashboard-orcamentos-${format(now, 'yyyy-MM-dd')}.pdf`);
}

function useDashboardClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  useEffect(() => {
    void (async () => {
      setLoadingClients(true);
      try {
        const data = await selectCrm<CrmClientRow>('companies', {
          select: 'id,nome_fantasia',
          orderBy: 'nome_fantasia',
          limit: 500,
        });
        setClients(
          data.map((client) => ({ id: client.id, name: client.nome_fantasia || client.id })),
        );
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    })();
  }, []);
  return { clients, loadingClients };
}

function useApprovalTokenStats() {
  const [tokenStats, setTokenStats] = useState<TokenStats>({ total: 0, viewed: 0, responded: 0 });
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('quote_approval_tokens')
        .select('id, viewed_at, responded_at');
      if (!data) return;
      setTokenStats({
        total: data.length,
        viewed: data.filter((token) => token.viewed_at).length,
        responded: data.filter((token) => token.responded_at).length,
      });
    })();
  }, []);
  return tokenStats;
}

function useDashboardClientOptions(quotes: Quote[], clients: Client[], selectedClientId: string) {
  const quotesClients = useMemo(() => {
    const map = new Map<string, string>();
    quotes.forEach((quote) => {
      if (quote.client_id && quote.client_name) map.set(quote.client_id, quote.client_name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [quotes]);
  const selectedClientName = useMemo(() => {
    if (selectedClientId === 'all') return null;
    return (
      clients.find((client) => client.id === selectedClientId)?.name ||
      quotesClients.find((client) => client.id === selectedClientId)?.name ||
      null
    );
  }, [selectedClientId, clients, quotesClients]);
  return { quotesClients, selectedClientName };
}

export function useQuotesDashboard() {
  const { quotes, isLoading } = useQuotes();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const { clients, loadingClients } = useDashboardClients();
  const tokenStats = useApprovalTokenStats();
  const { quotesClients, selectedClientName } = useDashboardClientOptions(
    quotes,
    clients,
    selectedClientId,
  );

  const metrics = useMemo(
    () => calculateDashboardMetrics(quotes, selectedPeriod, selectedClientId),
    [quotes, selectedPeriod, selectedClientId],
  );

  const exportToPdf = useCallback(() => {
    exportDashboardPdf({
      metrics,
      tokenStats,
      quotes,
      period: selectedPeriod,
      clientName: selectedClientName,
    });
  }, [metrics, tokenStats, quotes, selectedPeriod, selectedClientName]);

  return {
    quotes,
    isLoading,
    selectedPeriod,
    setSelectedPeriod,
    selectedClientId,
    setSelectedClientId,
    clients,
    quotesClients,
    loadingClients,
    tokenStats,
    selectedClientName,
    metrics,
    exportToPdf,
  };
}
