import { useState, useMemo, useEffect } from "react";
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

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [paFilter, setPaFilter] = useState<string>(searchParams.get("pa") || "all");
  const [singularFilter, setSingularFilter] = useState<string>(searchParams.get("singular") || "all");

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["sicoob_orders_list", searchTerm, statusFilter, paFilter, singularFilter, searchParams.get("from"), searchParams.get("to")],
    queryFn: () => sicoobOrderService.listOrders({
      search: searchTerm,
      status: statusFilter,
      pa_id: paFilter,
      cooperative_id: singularFilter,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined
    })
  });

  const filteredOrders = orders;

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

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (paFilter !== "all") params.set("pa", paFilter);
    if (singularFilter !== "all") params.set("singular", singularFilter);
    if (dateRange?.from) params.set("from", dateRange.from.toISOString());
    if (dateRange?.to) params.set("to", dateRange.to.toISOString());
    
    setSearchParams(params, { replace: true });
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
          {filteredOrders.length} {filteredOrders.length === 1 ? "pedido encontrado" : "pedidos encontrados"}
        </div>

        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum pedido corresponde aos filtros selecionados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/sicoob/pedidos/${order.id}`)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pedido #{order.id}
                  </CardTitle>
                  <OrderStatusBadge status={order.status} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <p className="text-xs text-muted-foreground">
                    {order.pa} • {order.singular} • {order.items} itens
                  </p>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground pt-0">
                  Criado em {format(parseISO(order.date), "dd/MM/yyyy", { locale: ptBR })}
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
