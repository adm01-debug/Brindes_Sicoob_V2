import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, FileSpreadsheet, FileBarChart, History, Download, CalendarIcon, Loader2, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/sicoob/orders/OrderStatusBadge";
import { toast } from "sonner";

const REPORTS = [
  { title: "Consumo por Ponto de Atendimento", desc: "Detalhamento de gastos e orçamentos por agência (PA).", icon: FileBarChart, type: "PDF / Excel" },
  { title: "Relatório de NF e Pagamentos", desc: "Controle de notas fiscais emitidas e status de liquidação.", icon: FileSpreadsheet, type: "Excel" },
  { title: "Auditoria de Aprovações SICOOB", desc: "Log completo de quem aprovou ou rejeitou cada pedido.", icon: FileText, type: "PDF" },
  { title: "Performance de Logística", desc: "Métricas de prazos de entrega e ocorrências de transporte.", icon: FileBarChart, type: "PDF" },
];

export default function SicoobReportsPage() {
  const { profile } = useAuth();
  const [isExporting, setIsExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  const { data: budgetHistory } = useQuery({
    queryKey: ["pa-budget-history", profile?.pa_id],
    queryFn: async () => {
      if (!profile?.pa_id) return [];
      const { data, error } = await supabase
        .from("pa_budgets")
        .select("*")
        .eq("pa_id", profile.pa_id)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.pa_id
  });

  const { data: ordersInRange } = useQuery({
    queryKey: ["pa-orders-range", profile?.pa_id, date?.from, date?.to],
    queryFn: async () => {
      if (!profile?.pa_id || !date?.from) return [];
      let query = supabase
        .from("sicoob_orders")
        .select("*")
        .eq("pa_id", profile.pa_id)
        .gte("created_at", date.from.toISOString());
      
      if (date.to) {
        query = query.lte("created_at", date.to.toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.pa_id
  });

  const totalSpent = ordersInRange?.reduce((acc, order) => acc + (order.total_amount || 0), 0) || 0;

  const handleExport = async () => {
    if (!ordersInRange || ordersInRange.length === 0) {
      toast.error("Não há dados para exportar no período selecionado.");
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(0, 54, 65); // Sicoob Green Dark
      doc.text("Extrato de Verba SICOOB", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const periodLabel = date?.from 
        ? `${format(date.from, "dd/MM/yyyy")} até ${date.to ? format(date.to, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}`
        : "Todo o período";
      doc.text(`Período: ${periodLabel}`, 14, 28);
      doc.text(`PA: ${profile?.pa_id || "Não identificado"}`, 14, 34);

      const tableData = ordersInRange.map(o => [
        format(new Date(o.created_at), "dd/MM/yyyy"),
        `#${o.order_number || o.id.slice(0, 8)}`,
        o.status.toUpperCase(),
        `R$ ${o.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: 40,
        head: [["Data", "Pedido", "Status", "Valor"]],
        body: tableData,
        headStyles: { fillStyle: 'fill', fillColor: [0, 54, 65] },
        foot: [["", "TOTAL", "", `R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 54, 65], fontStyle: 'bold' }
      });

      doc.save(`extrato_sicoob_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("Extrato exportado com sucesso (PDF)");
    } catch (error: any) {
      toast.error("Erro ao exportar: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MainLayout>
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
            <Button 
              className="bg-sicoob-green hover:bg-sicoob-green-dark" 
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-[1.5px] bg-sicoob-green/5 border-sicoob-green/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-sicoob-green-dark">Gasto no Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sicoob-green-dark">{formatCurrency(totalSpent)}</div>
              <p className="text-xs text-sicoob-green/70 mt-1">{ordersInRange?.length || 0} pedidos realizados</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(ordersInRange?.length ? totalSpent / ordersInRange.length : 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-blue-600/80 font-medium">Por pedido consolidado</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Economia Estimada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSpent * 0.12)}</div>
              <p className="text-xs text-muted-foreground mt-1">Via compra centralizada (Singular)</p>
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
                <CardDescription>Lista detalhada de todos os débitos em verba para o intervalo selecionado.</CardDescription>
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
                    {ordersInRange?.length === 0 ? (
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
                          <TableCell><OrderStatusBadge status={order.status} className="text-[10px] uppercase" /></TableCell>
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
              {budgetHistory?.map((bh: any) => (
                <Card key={bh.id} className="border-[1.5px] hover:border-sicoob-green/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                       <CardTitle className="text-md capitalize">
                         {format(new Date(bh.ano, bh.mes - 1), "MMMM 'de' yyyy", { locale: ptBR })}
                       </CardTitle>
                       <Badge variant="outline" className="bg-sicoob-green/5 text-sicoob-green border-sicoob-green/20">
                         {((bh.verba_consumida / bh.verba_total) * 100).toFixed(0)}% Utilizado
                       </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <span className="text-[10px] uppercase font-bold text-muted-foreground">Verba Total</span>
                         <div className="font-bold text-sm">{formatCurrency(bh.verba_total)}</div>
                       </div>
                       <div className="space-y-1">
                         <span className="text-[10px] uppercase font-bold text-muted-foreground">Consumo</span>
                         <div className="font-bold text-sm text-red-600">{formatCurrency(bh.verba_consumida)}</div>
                       </div>
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
