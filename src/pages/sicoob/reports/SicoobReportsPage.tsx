import React, { useState } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  FileText,
  FileSpreadsheet,
  History,
  Download,
  CalendarIcon,
  Loader2,
  Search,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from '@e965/xlsx';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { isCommittedSicoobOrder, sumCommittedSicoobOrders } from '@/utils/sicoob/orderFinancials';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ptBR } from 'date-fns/locale';
import { endOfDay, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge } from '@/components/sicoob/orders/OrderStatusBadge';
import type { OrderStatus } from '@/types/sicoob/orders';
import { toast } from 'sonner';
import { formatMeasuredCurrency, SAVINGS_NOT_MEASURED } from '@/lib/sicoob/operationalMetrics';
import type { Database } from '@/integrations/supabase/types';

type SicoobOrderRow = Database['public']['Tables']['sicoob_orders']['Row'];

type BudgetHistoryRow = {
  id: string;
  pa_id: string;
  ano: number;
  mes: number;
  verba_total: number;
  verba_consumida: number;
  pa_count: number;
  pa_names: string[];
};

type RawBudgetHistoryRow = Omit<BudgetHistoryRow, 'pa_count' | 'pa_names'> & {
  postos_atendimento: { nome: string } | null;
};

async function fetchBudgetHistoryPage(
  paId: string | null | undefined,
  cooperativeId: string | null | undefined,
  offset: number,
  pageSize: number,
) {
  const currentYear = new Date().getUTCFullYear();
  let query = supabase
    .from('pa_budgets')
    .select(
      'id, pa_id, ano, mes, verba_total, verba_consumida, postos_atendimento!inner(nome, cooperativa_id)',
    )
    .gte('ano', currentYear - 1)
    .lte('ano', currentYear)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .order('pa_id', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + pageSize - 1);
  query = paId
    ? query.eq('pa_id', paId)
    : query.eq('postos_atendimento.cooperativa_id', cooperativeId!);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as RawBudgetHistoryRow[];
}

export async function fetchAllBudgetHistoryRows(
  paId: string | null | undefined,
  cooperativeId: string | null | undefined,
) {
  if (paId) return fetchBudgetHistoryPage(paId, null, 0, 12);
  if (!cooperativeId) return [];

  const pageSize = 1000;
  const rows: RawBudgetHistoryRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchBudgetHistoryPage(null, cooperativeId, offset, pageSize);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function toPaBudgetHistory(row: RawBudgetHistoryRow): BudgetHistoryRow {
  return {
    ...row,
    pa_count: 1,
    pa_names: row.postos_atendimento?.nome ? [row.postos_atendimento.nome] : [],
  };
}

function consolidateBudgetHistory(rows: RawBudgetHistoryRow[]) {
  const periods = new Map<string, BudgetHistoryRow>();
  for (const row of rows) {
    const key = `${row.ano}-${String(row.mes).padStart(2, '0')}`;
    const current = periods.get(key) ?? {
      id: key,
      pa_id: '',
      ano: row.ano,
      mes: row.mes,
      verba_total: 0,
      verba_consumida: 0,
      pa_count: 0,
      pa_names: [],
    };
    current.verba_total += Number(row.verba_total ?? 0);
    current.verba_consumida += Number(row.verba_consumida ?? 0);
    current.pa_count += 1;
    const paName = row.postos_atendimento?.nome;
    if (paName && !current.pa_names.includes(paName)) current.pa_names.push(paName);
    periods.set(key, current);
  }
  return [...periods.values()]
    .sort((left, right) => right.ano - left.ano || right.mes - left.mes)
    .slice(0, 12);
}

function getBudgetScopeDescription(paCount: number) {
  return paCount > 1 ? `Consolidado de ${paCount} PAs` : 'Competência do PA';
}

function getScopeLabel(paId?: string | null, cooperativeId?: string | null) {
  if (paId) return `PA ${paId}`;
  if (cooperativeId) return `Cooperativa ${cooperativeId}`;
  return 'Escopo não identificado';
}

function getPeriodLabel(date?: DateRange) {
  if (!date?.from) return 'Todo o período';
  return `${format(date.from, 'dd/MM/yyyy')} até ${date.to ? format(date.to, 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}`;
}

async function fetchBudgetHistory(paId?: string | null, cooperativeId?: string | null) {
  if (!paId && !cooperativeId) return [];
  const rows = await fetchAllBudgetHistoryRows(paId, cooperativeId);

  if (paId) {
    return rows.slice(0, 12).map(toPaBudgetHistory);
  }
  return consolidateBudgetHistory(rows);
}

async function fetchOrdersInRange(
  paId: string | null | undefined,
  cooperativeId: string | null | undefined,
  date?: DateRange,
) {
  if (!date?.from) return [];

  let query = supabase.from('sicoob_orders').select('*').gte('created_at', date.from.toISOString());

  if (paId) query = query.eq('pa_id', paId);
  else if (cooperativeId) query = query.eq('cooperative_id', cooperativeId);
  else return [];

  if (date.to) {
    query = query.lte('created_at', endOfDay(date.to).toISOString());
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

function useReportExports({
  orders,
  date,
  scopeLabel,
  totalSpent,
}: {
  orders: SicoobOrderRow[];
  date?: DateRange;
  scopeLabel: string;
  totalSpent: number;
}) {
  const [isExporting, setIsExporting] = useState<'pdf' | 'xlsx' | null>(null);

  const handleExportPDF = async () => {
    if (orders.length === 0) {
      toast.error('Não há dados para exportar no período selecionado.');
      return;
    }

    setIsExporting('pdf');
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(0, 54, 65);
      doc.text('Extrato de Verba SICOOB', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Período: ${getPeriodLabel(date)}`, 14, 28);
      doc.text(`Escopo: ${scopeLabel}`, 14, 34);

      const tableData = orders.map((order) => [
        format(new Date(order.created_at), 'dd/MM/yyyy'),
        `#${order.order_number || order.id.slice(0, 8)}`,
        order.status.toUpperCase(),
        `R$ ${Number(order.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Data', 'Pedido', 'Status', 'Valor']],
        body: tableData,
        headStyles: { fillColor: [0, 54, 65] },
        foot: [
          [
            '',
            'TOTAL',
            '',
            `R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          ],
        ],
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 54, 65],
          fontStyle: 'bold',
        },
      });
      doc.save(`extrato_sicoob_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Extrato exportado com sucesso (PDF)');
    } catch (error: unknown) {
      toast.error(
        'Erro ao exportar PDF: ' + (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (orders.length === 0) {
      toast.error('Não há dados para exportar no período selecionado.');
      return;
    }

    setIsExporting('xlsx');
    try {
      const data = orders.map((order) => ({
        Data: format(new Date(order.created_at), 'dd/MM/yyyy'),
        Pedido: order.order_number || order.id.slice(0, 8),
        Status: order.status.toUpperCase(),
        'Valor (R$)': order.total_amount,
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Extrato SICOOB');
      XLSX.writeFile(workbook, `extrato_sicoob_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Extrato exportado com sucesso (XLSX)');
    } catch (error: unknown) {
      toast.error(
        'Erro ao exportar Excel: ' + (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsExporting(null);
    }
  };

  return { isExporting, handleExportPDF, handleExportExcel };
}

function DateRangeLabel({ date }: { date?: DateRange }) {
  if (!date?.from) return <span>Selecionar período</span>;
  if (!date.to) return <>{format(date.from, 'dd/MM/yy')}</>;
  return (
    <>
      {format(date.from, 'dd/MM/yy')} - {format(date.to, 'dd/MM/yy')}
    </>
  );
}

function ReportsToolbar({
  date,
  setDate,
  isExporting,
  onExportPDF,
  onExportExcel,
}: {
  date?: DateRange;
  setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  isExporting: boolean;
  onExportPDF: () => void;
  onExportExcel: () => void;
}) {
  return (
    <div className="flex w-full gap-2 md:w-auto">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal md:w-[280px]',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <DateRangeLabel date={date} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button className="bg-sicoob-green hover:bg-sicoob-green-dark" disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-2">
          <div className="grid gap-1">
            <Button variant="ghost" className="h-8 justify-start font-normal" onClick={onExportPDF}>
              <FileText className="mr-2 h-3 w-3" />
              PDF
            </Button>
            <Button
              variant="ghost"
              className="h-8 justify-start font-normal"
              onClick={onExportExcel}
            >
              <FileSpreadsheet className="mr-2 h-3 w-3" />
              Excel (XLSX)
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ReportKpis({
  committedOrders,
  totalSpent,
}: {
  committedOrders: SicoobOrderRow[];
  totalSpent: number;
}) {
  const averageTicket = committedOrders.length > 0 ? totalSpent / committedOrders.length : 0;
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card className="border-[1.5px] border-sicoob-green/20 bg-sicoob-green/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-sicoob-green-dark">
            Gasto no Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-sicoob-green-dark">
            {formatMeasuredCurrency(totalSpent, committedOrders.length, formatCurrency)}
          </div>
          <p className="mt-1 text-xs text-sicoob-green/70">
            {committedOrders.length} pedidos confirmados
          </p>
        </CardContent>
      </Card>
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatMeasuredCurrency(averageTicket, committedOrders.length, formatCurrency)}
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground text-status-transit/80">
            Por pedido consolidado
          </p>
        </CardContent>
      </Card>
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Economia comprovada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">Não medida</div>
          <p className="mt-1 text-xs text-muted-foreground">{SAVINGS_NOT_MEASURED}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersExtract({
  orders,
  isLoading,
  error,
}: {
  orders: SicoobOrderRow[];
  isLoading: boolean;
  error: unknown;
}) {
  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <TableRow>
        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
          Carregando dados do período…
        </TableCell>
      </TableRow>
    );
  } else if (error) {
    content = (
      <TableRow>
        <TableCell colSpan={4} className="py-8 text-center text-destructive">
          Não foi possível medir o período selecionado.
        </TableCell>
      </TableRow>
    );
  } else if (orders.length === 0) {
    content = (
      <TableRow>
        <TableCell colSpan={4} className="py-8 text-center italic text-muted-foreground">
          Nenhuma movimentação encontrada no período.
        </TableCell>
      </TableRow>
    );
  } else {
    content = orders.map((order) => (
      <TableRow key={order.id}>
        <TableCell className="text-xs">
          {new Date(order.created_at).toLocaleDateString('pt-BR')}
        </TableCell>
        <TableCell className="font-mono text-xs">
          #{order.order_number || order.id.slice(0, 8)}
        </TableCell>
        <TableCell>
          <OrderStatusBadge
            status={order.status as OrderStatus}
            className="text-[10px] uppercase"
          />
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(order.total_amount)}
        </TableCell>
      </TableRow>
    ));
  }

  return (
    <Card className="border-[1.5px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-sicoob-green-dark">
          <Search className="h-5 w-5" /> Movimentações do Período
        </CardTitle>
        <CardDescription>
          Lista detalhada dos pedidos no intervalo; o total considera somente estados confirmados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{content}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BudgetHistoryCard({ row }: { row: BudgetHistoryRow }) {
  const usageLabel =
    Number(row.verba_total) > 0
      ? `${((row.verba_consumida / row.verba_total) * 100).toFixed(0)}% utilizado`
      : 'Base total não informada';
  return (
    <Card className="border-[1.5px] transition-colors hover:border-sicoob-green/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md capitalize">
            {format(new Date(row.ano, row.mes - 1), "MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </CardTitle>
          <Badge
            variant="outline"
            className="border-sicoob-green/20 bg-sicoob-green/5 text-sicoob-green"
          >
            {usageLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <p className="text-xs text-muted-foreground">{getBudgetScopeDescription(row.pa_count)}</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              Verba Total
            </span>
            <div className="text-sm font-bold">{formatCurrency(row.verba_total)}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Consumo</span>
            <div className="text-sm font-bold text-destructive">
              {formatCurrency(row.verba_consumida)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetHistoryGrid({
  rows,
  isLoading,
  error,
}: {
  rows?: BudgetHistoryRow[];
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando histórico medido…</p>;
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar o histórico de verba.
      </p>
    );
  }
  if (!rows?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma competência de verba foi registrada neste escopo.
      </p>
    );
  }
  return (
    <>
      {rows.map((row) => (
        <BudgetHistoryCard key={row.id} row={row} />
      ))}
    </>
  );
}

function useSicoobReportData(
  paId: string | null | undefined,
  cooperativeId: string | null | undefined,
  date?: DateRange,
) {
  const scopeId = paId ?? cooperativeId;
  const budgetQuery = useQuery({
    queryKey: ['sicoob-budget-history', paId, cooperativeId],
    queryFn: () => fetchBudgetHistory(paId, cooperativeId),
    enabled: Boolean(scopeId),
  });
  const ordersQuery = useQuery({
    queryKey: ['sicoob-orders-range', paId, cooperativeId, date?.from, date?.to],
    queryFn: () => fetchOrdersInRange(paId, cooperativeId, date),
    enabled: Boolean(scopeId && date?.from),
  });
  const orders = ordersQuery.data ?? [];
  const committedOrders = orders.filter(isCommittedSicoobOrder);
  return {
    budgetHistory: budgetQuery.data,
    isBudgetLoading: budgetQuery.isLoading,
    budgetError: budgetQuery.error,
    orders,
    isOrdersLoading: ordersQuery.isLoading,
    ordersError: ordersQuery.error,
    committedOrders,
    totalSpent: sumCommittedSicoobOrders(committedOrders),
  };
}

export default function SicoobReportsPage() {
  const { profile } = useAuth();
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const paId = profile?.pa_id;
  const cooperativeId = profile?.cooperativa_id;
  const scopeLabel = getScopeLabel(paId, cooperativeId);
  const {
    budgetHistory,
    isBudgetLoading,
    budgetError,
    orders: ordersInRange,
    isOrdersLoading,
    ordersError,
    committedOrders,
    totalSpent,
  } = useSicoobReportData(paId, cooperativeId, date);
  const { isExporting, handleExportPDF, handleExportExcel } = useReportExports({
    orders: ordersInRange,
    date,
    scopeLabel,
    totalSpent,
  });

  return (
    <>
      <div className="container mx-auto animate-fade-in space-y-8 p-4 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">
              Relatórios SICOOB
            </h1>
            <p className="text-sm italic text-muted-foreground">
              Transparência e controle sobre a verba e os pedidos da agência.
            </p>
          </div>
          <ReportsToolbar
            date={date}
            setDate={setDate}
            isExporting={isExporting !== null}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
        </div>

        <ReportKpis committedOrders={committedOrders} totalSpent={totalSpent} />

        <Tabs defaultValue="extract" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="extract" className="gap-2">
              <FileText className="h-4 w-4" /> Extrato de Verba
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> Histórico Mensal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extract" className="space-y-6">
            <OrdersExtract orders={ordersInRange} isLoading={isOrdersLoading} error={ordersError} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <BudgetHistoryGrid
                rows={budgetHistory}
                isLoading={isBudgetLoading}
                error={budgetError}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
