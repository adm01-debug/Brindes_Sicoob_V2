import React, { useState } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, FileSpreadsheet, FileBarChart, History, Download, CalendarIcon, Loader2, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "@e965/xlsx";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { isCommittedSicoobOrder, sumCommittedSicoobOrders } from "@/utils/sicoob/orderFinancials";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ptBR } from "date-fns/locale";
import { endOfDay, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/sicoob/orders/OrderStatusBadge";
import type { OrderStatus } from "@/types/sicoob/orders";
import { toast } from "sonner";
import { formatMeasuredCurrency, SAVINGS_NOT_MEASURED } from "@/lib/sicoob/operationalMetrics";

const REPORTS = [
  { title: "Consumo por Ponto de Atendimento", desc: "Detalhamento de gastos e orçamentos por agência (PA).", icon: FileBarChart, type: "PDF / Excel" },
  { title: "Relatório de NF e Pagamentos", desc: "Controle de notas fiscais emitidas e status de liquidação.", icon: FileSpreadsheet, type: "Excel" },
  { title: "Auditoria de Aprovações SICOOB", desc: "Log completo de quem aprovou ou rejeitou cada pedido.", icon: FileText, type: "PDF" },
  { title: "Performance de Logística", desc: "Métricas de prazos de entrega e ocorrências de transporte.", icon: FileBarChart, type: "PDF" },
];

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

type RawBudgetHistoryRow = Omit<BudgetHistoryRow, "pa_count" | "pa_names"> & {
  postos_atendimento: { nome: string } | null;
};

async function fetchBudgetHistoryPage(
  paId: string | null | undefined,
  cooperativePaIds: string[],
  offset: number,
  pageSize: number,
) {
  let query = supabase
    .from("pa_budgets")
    .select("id, pa_id, ano, mes, verba_total, verba_consumida, postos_atendimento(nome)")
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .range(offset, offset + pageSize - 1);
  query = paId ? query.eq("pa_id", paId) : query.in("pa_id", cooperativePaIds);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as RawBudgetHistoryRow[];
}

async function fetchAllBudgetHistoryRows(paId: string | null | undefined, cooperativePaIds: string[]) {
  const pageSize = 1000;
  const rows: RawBudgetHistoryRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchBudgetHistoryPage(paId, cooperativePaIds, offset, pageSize);
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
    const key = `${row.ano}-${String(row.mes).padStart(2, "0")}`;
    const current = periods.get(key) ?? {
      id: key,
      pa_id: "",
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
    .sort((left, right) => (right.ano - left.ano) || (right.mes - left.mes))
    .slice(0, 12);
}

function getBudgetScopeDescription(paCount: number) {
  return paCount > 1 ? `Consolidado de ${paCount} PAs` : "Competência do PA";
}

function getScopeLabel(paId?: string | null, cooperativeId?: string | null) {
  if (paId) return `PA ${paId}`;
  if (cooperativeId) return `Cooperativa ${cooperativeId}`;
  return "Escopo não identificado";
}

function getPeriodLabel(date?: DateRange) {
  if (!date?.from) return "Todo o período";
  return `${format(date.from, "dd/MM/yyyy")} até ${date.to ? format(date.to, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}`;
}

async function fetchBudgetHistory(paId?: string | null, cooperativeId?: string | null) {
  if (!paId && !cooperativeId) return [];

  let cooperativePaIds: string[] = [];
  if (!paId && cooperativeId) {
    const { data: paRows, error: paError } = await supabase
      .from("postos_atendimento")
      .select("id")
      .eq("cooperativa_id", cooperativeId);
    if (paError) throw paError;
    cooperativePaIds = (paRows ?? []).map((pa) => pa.id);
    if (cooperativePaIds.length === 0) return [];
  }

  const rows = await fetchAllBudgetHistoryRows(paId, cooperativePaIds);

  if (paId) {
    return rows.slice(0, 12).map(toPaBudgetHistory);
  }
  return consolidateBudgetHistory(rows);
}

export default function SicoobReportsPage() {
  const { profile } = useAuth();
  const [isExporting, setIsExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  const scopeId = profile?.pa_id ?? profile?.cooperativa_id;
  const scopeLabel = getScopeLabel(profile?.pa_id, profile?.cooperativa_id);
  const { data: budgetHistory, isLoading: isBudgetLoading, error: budgetError } = useQuery({
    queryKey: ["sicoob-budget-history", profile?.pa_id, profile?.cooperativa_id],
    queryFn: () => fetchBudgetHistory(profile?.pa_id, profile?.cooperativa_id),
    enabled: Boolean(scopeId),
  });

  const { data: ordersInRange, isLoading: isOrdersLoading, error: ordersError } = useQuery({
    queryKey: ["sicoob-orders-range", profile?.pa_id, profile?.cooperativa_id, date?.from, date?.to],
    queryFn: async () => {
      if (!scopeId || !date?.from) return [];
      let query = supabase
        .from("sicoob_orders")
        .select("*")
        .gte("created_at", date.from.toISOString());
      query = profile?.pa_id ? query.eq("pa_id", profile.pa_id) : query.eq("cooperative_id", profile!.cooperativa_id!);
      
      if (date.to) {
        query = query.lte("created_at", endOfDay(date.to).toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(scopeId && date?.from),
  });

  const committedOrders = ordersInRange?.filter(isCommittedSicoobOrder) || [];
  const totalSpent = sumCommittedSicoobOrders(committedOrders);

  const handleExportPDF = async () => {
    if (!ordersInRange || ordersInRange.length === 0) {
      toast.error("Não há dados para exportar no período selecionado.");
      return;
    }

    setIsExporting('pdf');
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(0, 54, 65); // Sicoob Green Dark
      doc.text("Extrato de Verba SICOOB", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const periodLabel = getPeriodLabel(date);
      doc.text(`Período: ${periodLabel}`, 14, 28);
      doc.text(`Escopo: ${scopeLabel}`, 14, 34);

      const tableData = ordersInRange.map(o => [
        format(new Date(o.created_at), "dd/MM/yyyy"),
        `#${o.order_number || o.id.slice(0, 8)}`,
        o.status.toUpperCase(),
        `R$ ${(o.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: 40,
        head: [["Data", "Pedido", "Status", "Valor"]],
        body: tableData,
        headStyles: { fillColor: [0, 54, 65] },
        foot: [["", "TOTAL", "", `R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 54, 65], fontStyle: 'bold' }
      });

      doc.save(`extrato_sicoob_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("Extrato exportado com sucesso (PDF)");
    } catch (error: any) {
      toast.error("Erro ao exportar PDF: " + error.message);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (!ordersInRange || ordersInRange.length === 0) {
      toast.error("Não há dados para exportar no período selecionado.");
      return;
    }

    setIsExporting('xlsx');
    try {
      const data = ordersInRange.map(o => ({
        "Data": format(new Date(o.created_at), "dd/MM/yyyy"),
        "Pedido": o.order_number || o.id.slice(0, 8),
        "Status": o.status.toUpperCase(),
        "Valor (R$)": o.total_amount
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Extrato SICOOB");
      
      XLSX.writeFile(workbook, `extrato_sicoob_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success("Extrato exportado com sucesso (XLSX)");
    } catch (error: any) {
      toast.error("Erro ao exportar Excel: " + error.message);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Relatórios SICOOB</h1>
            <p className="text-muted-foreground italic text-sm">Transparência e controle sobre a verba e os pedidos da agência.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal w-full md:w-[280px]", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>{format(date.from, "dd/MM/yy")} - {format(date.to, "dd/MM/yy")}</>
                    ) : (
                      format(date.from, "dd/MM/yy")
                    )
                  ) : (
                    <span>Selecionar período</span>
                  )}
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
                <Button 
                  className="bg-sicoob-green hover:bg-sicoob-green-dark" 
                  disabled={isExporting !== null}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Exportar
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-2">
                <div className="grid gap-1">
                  <Button variant="ghost" className="justify-start font-normal h-8" onClick={handleExportPDF}>
                    <FileText className="h-3 w-3 mr-2" />
                    PDF
                  </Button>
                  <Button variant="ghost" className="justify-start font-normal h-8" onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-3 w-3 mr-2" />
                    Excel (XLSX)
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-[1.5px] bg-sicoob-green/5 border-sicoob-green/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-sicoob-green-dark">Gasto no Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sicoob-green-dark">{formatMeasuredCurrency(totalSpent, committedOrders.length, formatCurrency)}</div>
              <p className="text-xs text-sicoob-green/70 mt-1">{committedOrders.length} pedidos confirmados</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMeasuredCurrency(committedOrders.length ? totalSpent / committedOrders.length : 0, committedOrders.length, formatCurrency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-status-transit/80 font-medium">Por pedido consolidado</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Economia comprovada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">Não medida</div>
              <p className="text-xs text-muted-foreground mt-1">{SAVINGS_NOT_MEASURED}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="extract" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="extract" className="gap-2"><FileText className="h-4 w-4" /> Extrato de Verba</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Histórico Mensal</TabsTrigger>
          </TabsList>

          <TabsContent value="extract" className="space-y-6">
            <Card className="border-[1.5px]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-sicoob-green-dark">
                  <Search className="h-5 w-5" /> Movimentações do Período
                </CardTitle>
                <CardDescription>Lista detalhada dos pedidos no intervalo; o total considera somente estados confirmados.</CardDescription>
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
                  <TableBody>
                    {isOrdersLoading ? (
                      <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Carregando dados do período…</TableCell></TableRow>
                    ) : ordersError ? (
                      <TableRow><TableCell colSpan={4} className="py-8 text-center text-destructive">Não foi possível medir o período selecionado.</TableCell></TableRow>
                    ) : ordersInRange?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                          Nenhuma movimentação encontrada no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ordersInRange?.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="text-xs">{new Date(order.created_at).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="font-mono text-xs">#{order.order_number || order.id.slice(0, 8)}</TableCell>
                          <TableCell><OrderStatusBadge status={order.status as OrderStatus} className="text-[10px] uppercase" /></TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(order.total_amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isBudgetLoading && <p className="text-sm text-muted-foreground">Carregando histórico medido…</p>}
              {budgetError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar o histórico de verba.</p>}
              {!isBudgetLoading && !budgetError && budgetHistory?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma competência de verba foi registrada neste escopo.</p>}
              {budgetHistory?.map((bh) => (
                <Card key={bh.id} className="border-[1.5px] hover:border-sicoob-green/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                       <CardTitle className="text-md capitalize">
                         {format(new Date(bh.ano, bh.mes - 1), "MMMM 'de' yyyy", { locale: ptBR })}
                       </CardTitle>
                       <Badge variant="outline" className="bg-sicoob-green/5 text-sicoob-green border-sicoob-green/20">
                         {Number(bh.verba_total) > 0 ? `${((bh.verba_consumida / bh.verba_total) * 100).toFixed(0)}% utilizado` : "Base total não informada"}
                       </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                     <p className="text-xs text-muted-foreground">
                       {getBudgetScopeDescription(bh.pa_count)}
                     </p>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <span className="text-[10px] uppercase font-bold text-muted-foreground">Verba Total</span>
                         <div className="font-bold text-sm">{formatCurrency(bh.verba_total)}</div>
                       </div>
                       <div className="space-y-1">
                         <span className="text-[10px] uppercase font-bold text-muted-foreground">Consumo</span>
                         <div className="font-bold text-sm text-destructive">{formatCurrency(bh.verba_consumida)}</div>
                       </div>
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
