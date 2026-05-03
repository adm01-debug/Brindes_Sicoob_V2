import { useState, useMemo, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  LayoutGrid,
  Search,
  Filter,
  ArrowRight,
  X,
  CalendarIcon,
  Download,
  FileDown,
  Loader2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/AuthContext";
import { OrderStatusBadge } from "@/components/sicoob/orders/OrderStatusBadge";
import { OrderStatus, ORDER_STATUS_OPTIONS } from "@/types/sicoob/orders";
import { sicoobOrderService } from "@/services/sicoob/orderService";
import { useQuery } from "@tanstack/react-query";

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isVendedorRole, isAdmin, user } = useAuth();
  const canCreateOrder = isVendedorRole || isAdmin;
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | 'xlsx' | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkApproving, setIsExportingBulk] = useState(false);

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [paFilter, setPaFilter] = useState<string>(searchParams.get("pa") || "all");
  const [singularFilter, setSingularFilter] = useState<string>(searchParams.get("singular") || "all");

  const [page, setPage] = useState(1);
  const pageSize = 9;

  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["sicoob_orders_list", searchTerm, statusFilter, paFilter, singularFilter, searchParams.get("from"), searchParams.get("to"), page],
    queryFn: async () => {
      const results = await sicoobOrderService.listOrders({
        search: searchTerm,
        status: statusFilter,
        pa_id: paFilter,
        cooperative_id: singularFilter,
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined
      });
      
      // Implement client-side pagination since listOrders returns all
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return {
        orders: results.slice(start, end),
        total: results.length
      };
    }
  });

  const filteredOrders = ordersData?.orders || [];
  const totalOrders = ordersData?.total || 0;
  const totalPages = Math.ceil(totalOrders / pageSize);

  const exportToCSV = async () => {
    setIsExporting('csv');
    try {
      // Simulate potential timeout/error if requested by testing hooks or environment
      if (window.location.search.includes('simulate-timeout')) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        throw new Error("Timeout na exportação");
      }
      
      const headers = ["ID", "PA", "Singular", "Status", "Total (R$)", "Itens", "Data"];
      const rows = filteredOrders.map(o => [
        o.id,
        (o as any).pa?.nome || o.pa_id,
        (o as any).cooperativa?.nome || o.cooperative_id,
        o.status,
        o.total_amount.toFixed(2),
        "N/A", // Items count would need another join
        o.created_at
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `pedidos_sicoob_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Exportação CSV concluída");
    } catch (error: any) {
      toast.error("Erro na exportação: " + error.message);
    } finally {
      setIsExporting(null);
    }
  };

  const exportToPDF = async () => {
    setIsExporting('pdf');
    try {
      if (window.location.search.includes('simulate-500')) {
        throw new Error("Erro interno do servidor (Simulado)");
      }

      const doc = new jsPDF();
      doc.text("Relatório de Pedidos Sicoob", 14, 15);
      
      const tableData = filteredOrders.map(o => [
        o.id,
        (o as any).pa?.nome || o.pa_id,
        (o as any).cooperativa?.nome || o.cooperative_id,
        o.status,
        `R$ ${o.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        "N/A",
        format(parseISO(o.created_at), "dd/MM/yyyy")
      ]);

      autoTable(doc, {
        startY: 20,
        head: [["ID", "PA", "Singular", "Status", "Total", "Itens", "Data"]],
        body: tableData,
      });

      doc.save(`pedidos_sicoob_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("Exportação PDF concluída");
    } catch (error: any) {
      toast.error("Erro na exportação: " + error.message);
    } finally {
      setIsExporting(null);
    }
  };

  const exportToXLSX = async () => {
    setIsExporting('xlsx');
    try {
      const data = filteredOrders.map(o => ({
        "ID": o.id,
        "PA": (o as any).pa?.nome || o.pa_id,
        "Singular": (o as any).cooperativa?.nome || o.cooperative_id,
        "Status": o.status,
        "Total (R$)": o.total_amount,
        "Itens": "N/A",
        "Data": format(parseISO(o.created_at), "dd/MM/yyyy")
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos Sicoob");
      
      XLSX.writeFile(workbook, `pedidos_sicoob_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success("Exportação XLSX concluída");
    } catch (error: any) {
      toast.error("Erro na exportação: " + error.message);
    } finally {
      setIsExporting(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedOrderIds.length === 0) return;
    
    setIsExportingBulk(true);
    try {
      const result = await sicoobOrderService.approveOrdersBulk(selectedOrderIds);
      
      if (result.failures.length > 0) {
        toast.warning(`Aprovação concluída com avisos`, {
          description: `${result.successes.length} aprovados, ${result.failures.length} falharam.`,
        });
      } else {
        toast.success(`${result.successes.length} pedidos aprovados com sucesso!`);
      }
      
      setSelectedOrderIds([]);
    } catch (error: any) {
      toast.error("Erro na aprovação em lote: " + error.message);
    } finally {
      setIsExportingBulk(false);
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };
  
  const initialDateRange = useMemo(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from) {
      return {
        from: new Date(from),
        to: to ? new Date(to) : undefined
      };
    }
    return undefined;
  }, []); // Only on mount

  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);

  // Sync state to URL and reset page on filter change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (paFilter !== "all") params.set("pa", paFilter);
    if (singularFilter !== "all") params.set("singular", singularFilter);
    if (dateRange?.from) params.set("from", dateRange.from.toISOString());
    if (dateRange?.to) params.set("to", dateRange.to.toISOString());
    
    setSearchParams(params, { replace: true });
    setPage(1); // Reset page when filters change
  }, [searchTerm, statusFilter, paFilter, singularFilter, dateRange]);


  const { data: pas = [] } = useQuery({
    queryKey: ["postos_atendimento"],
    queryFn: async () => {
      const { data } = await supabase.from("postos_atendimento").select("id, nome");
      return data || [];
    }
  });

  const { data: cooperatives = [] } = useQuery({
    queryKey: ["cooperativas"],
    queryFn: async () => {
      const { data } = await supabase.from("cooperativas").select("id, nome");
      return data || [];
    }
  });

  const paOptions = pas;
  const singularOptions = cooperatives;


  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (paFilter !== "all" ? 1 : 0) +
    (singularFilter !== "all" ? 1 : 0) +
    (dateRange?.from ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setPaFilter("all");
    setSingularFilter("all");
    setDateRange(undefined);
  };

  return (
    <MainLayout>
      <PageSEO title="Pedidos Sicoob" description="Gerenciamento de pedidos do ecossistema Sicoob." path="/sicoob/pedidos" noIndex />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-sicoob-green-dark">Gestão de Pedidos</h1>
            <p className="text-muted-foreground italic">
              Acompanhamento centralizado de solicitações e fluxo de abastecimento SICOOB.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={isExporting !== null}>
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
                  <Button variant="ghost" className="justify-start font-normal h-8" onClick={exportToCSV}>
                    <Download className="h-3 w-3 mr-2" />
                    CSV
                  </Button>
                  <Button variant="ghost" className="justify-start font-normal h-8" onClick={exportToPDF}>
                    <FileDown className="h-3 w-3 mr-2" />
                    PDF
                  </Button>
                  <Button variant="ghost" className="justify-start font-normal h-8" onClick={exportToXLSX}>
                    <FileSpreadsheet className="h-3 w-3 mr-2" />
                    Excel (XLSX)
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => navigate("/sicoob/pedidos/kanban")}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            {canCreateOrder && (
              <Button onClick={() => navigate("/sicoob/pedidos/novo")}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
            )}
          </div>
        </div>

        {selectedOrderIds.length > 0 && (
          <Card className="bg-sicoob-green/5 border-sicoob-green/30 animate-in slide-in-from-top-4 duration-300">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-sicoob-green text-white">
                  {selectedOrderIds.length} selecionados
                </Badge>
                <span className="text-sm font-medium text-sicoob-green-dark">Ações em lote disponíveis</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedOrderIds([])}>
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  className="bg-sicoob-green hover:bg-sicoob-green-dark"
                  onClick={handleBulkApprove}
                  disabled={isBulkApproving}
                >
                  {isBulkApproving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Aprovar Selecionados
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por PA, Singular ou ID do pedido..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filtros avançados</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={clearFilters}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">Status do funil</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ORDER_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={s} />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">PA</Label>
                <Select value={paFilter} onValueChange={setPaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {pas.map((pa) => (
                      <SelectItem key={pa.id} value={pa.id}>
                        {pa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Singular</Label>
                <Select value={singularFilter} onValueChange={setSingularFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cooperatives.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecionar período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      locale={ptBR}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtros ativos:</span>
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                <OrderStatusBadge status={statusFilter as OrderStatus} />
                <button onClick={() => setStatusFilter("all")} aria-label="Remover filtro de status">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {paFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {paFilter}
                <button onClick={() => setPaFilter("all")} aria-label="Remover filtro de PA">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {singularFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {singularFilter}
                <button onClick={() => setSingularFilter("all")} aria-label="Remover filtro de Singular">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {dateRange?.from && (
              <Badge variant="secondary" className="gap-1">
                {format(dateRange.from, "dd/MM/yy", { locale: ptBR })}
                {dateRange.to && ` - ${format(dateRange.to, "dd/MM/yy", { locale: ptBR })}`}
                <button onClick={() => setDateRange(undefined)} aria-label="Remover filtro de período">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {totalOrders} {totalOrders === 1 ? "pedido encontrado" : "pedidos encontrados"}
        </div>

        {isLoadingOrders ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {[1, 2, 3, 4, 5, 6].map(i => (
               <Card key={i} className="h-32 animate-pulse bg-muted" />
             ))}
           </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum pedido corresponde aos filtros selecionados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order: any) => (
              <Card 
                key={order.id} 
                className={cn(
                  "hover:shadow-md transition-shadow cursor-pointer border-[1.5px] relative group",
                  selectedOrderIds.includes(order.id) ? "border-sicoob-green bg-sicoob-green/5 shadow-sm" : ""
                )} 
                onClick={() => navigate(`/sicoob/pedidos/${order.id}`)}
              >
                <div 
                  className={cn(
                    "absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity",
                    selectedOrderIds.includes(order.id) ? "opacity-100" : ""
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectOrder(order.id);
                  }}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    selectedOrderIds.includes(order.id) ? "bg-sicoob-green border-sicoob-green text-white" : "bg-white border-muted-foreground/30"
                  )}>
                    {selectedOrderIds.includes(order.id) && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-10">
                  <CardTitle className="text-sm font-bold text-sicoob-green-dark">
                    Pedido #{order.order_number || order.id.slice(0, 8)}
                  </CardTitle>
                  <OrderStatusBadge status={order.status} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.pa?.nome || "PA Não Identificado"} • {order.cooperativa?.nome || "Singular"}
                  </p>
                </CardContent>
                <CardFooter className="text-[10px] uppercase font-bold text-muted-foreground pt-0">
                  Criado em {format(parseISO(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  <ArrowRight className="h-3 w-3 ml-auto text-sicoob-green" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            <span className="text-sm font-medium">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
