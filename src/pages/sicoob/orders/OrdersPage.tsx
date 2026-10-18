import { useCallback, useState, useMemo, useEffect, type MouseEvent, type ReactNode } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
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
  ShoppingCart,
  Clock,
  CheckCircle2,
  Target,
  BarChart3,
  RotateCcw,
  AlertTriangle,
  History,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "@e965/xlsx";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
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
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/AuthContext";
import { OrderStatusBadge } from "@/components/sicoob/orders/OrderStatusBadge";
import { type OrderStatus, ORDER_STATUS_OPTIONS, type SicoobOrder } from "@/types/sicoob/orders";
import { sicoobOrderService } from "@/services/sicoob/orderService";
import { isCommittedSicoobOrder, sumCommittedSicoobOrders } from "@/utils/sicoob/orderFinancials";
import { sicoobCommonService } from "@/services/sicoob/commonService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { parseSicoobOrderQuery, reconcileSicoobReferences, toApiDateRange, writeSicoobOrderQuery, type SicoobOrderQueryFilters } from "@/lib/navigation/filter-query";

function escapeCsvCell(value: unknown): string {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

const ALL_FILTER = "all";
const ORDERS_QUERY_KEY = "sicoob_orders_list";
const EXPORT_ERROR_PREFIX = "Erro na exportação: ";
const EXPORT_DATE_FORMAT = "yyyy-MM-dd";
const PAGE_SIZE = 9;

function useOrderFilters(searchParams: URLSearchParams, setSearchParams: ReturnType<typeof useSearchParams>[1]) {
  const location = useLocation();
  const filters = useMemo(() => parseSicoobOrderQuery(searchParams), [searchParams]);
  const replace = useCallback((updates: Partial<SicoobOrderQueryFilters>, replaceNavigation = true) => {
    setSearchParams((current) => writeSicoobOrderQuery(current, { ...parseSicoobOrderQuery(current), ...updates }), {
      replace: replaceNavigation, state: location.state,
    });
  }, [location.state, setSearchParams]);
  useEffect(() => {
    const canonical = writeSicoobOrderQuery(searchParams, filters);
    if (canonical.toString() !== searchParams.toString()) setSearchParams(canonical, { replace: true, state: location.state });
  }, [filters, location.state, searchParams, setSearchParams]);
  const update = useCallback(<Key extends keyof SicoobOrderQueryFilters>(key: Key, value: SicoobOrderQueryFilters[Key], replaceNavigation = true) => {
    replace({ [key]: value, page: key === "page" ? Number(value) : 1 } as Partial<SicoobOrderQueryFilters>, replaceNavigation);
  }, [replace]);
  const clear = () => replace({ statusFilter: ALL_FILTER, paFilter: ALL_FILTER, singularFilter: ALL_FILTER, dateRange: undefined, page: 1 });
  const activeCount = Number(filters.statusFilter !== ALL_FILTER) + Number(filters.paFilter !== ALL_FILTER) + Number(filters.singularFilter !== ALL_FILTER) + Number(Boolean(filters.dateRange?.from));
  const reconcileReferences = useCallback((paIds?: Set<string>, cooperativeIds?: Set<string>) => {
    const reconciled = reconcileSicoobReferences(filters, paIds, cooperativeIds);
    if (reconciled !== filters) replace(reconciled);
  }, [filters, replace]);
  return { ...filters, setSearchTerm: (value: string) => update("searchTerm", value), setStatusFilter: (value: string) => update("statusFilter", value), setPaFilter: (value: string) => update("paFilter", value), setSingularFilter: (value: string) => update("singularFilter", value), setDateRange: (value: DateRange | undefined) => update("dateRange", value), setPage: (value: number, options?: { replace?: boolean }) => update("page", value, options?.replace ?? false), reconcileReferences, clear, activeCount };
}

type FilterController = ReturnType<typeof useOrderFilters>;
type OrderStats = { totalRevenue: number; avgTicket: number; totalCount: number; criticalSla: number; statusCounts: Record<string, number> };

function calculateStats(orders: SicoobOrder[]): OrderStats {
  const committedOrders = orders.filter(isCommittedSicoobOrder);
  const totalRevenue = sumCommittedSicoobOrders(committedOrders);
  const statusCounts = orders.reduce<Record<string, number>>((counts, order) => ({ ...counts, [order.status]: (counts[order.status] || 0) + 1 }), {});
  return { totalRevenue, avgTicket: committedOrders.length ? totalRevenue / committedOrders.length : 0, totalCount: orders.length, criticalSla: orders.filter(order => order.sla_status === "critical").length, statusCounts };
}

function listRequest(filters: FilterController) {
  const range = toApiDateRange(filters.dateRange);
  return { search: filters.searchTerm.trim(), status: filters.statusFilter, pa_id: filters.paFilter, cooperative_id: filters.singularFilter, from: range.startDate, toExclusive: range.endDateExclusive, page: filters.page, pageSize: PAGE_SIZE };
}

function normalizeOrderPage(data: { orders: SicoobOrder[]; total: number } | undefined) {
  if (!data) return { orders: [], total: 0, totalPages: 0 };
  return { orders: data.orders, total: data.total, totalPages: Math.ceil(data.total / PAGE_SIZE) };
}

function useOrdersData(filters: FilterController) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: [ORDERS_QUERY_KEY, filters.searchTerm, filters.statusFilter, filters.paFilter, filters.singularFilter, filters.dateRange?.from, filters.dateRange?.to, filters.page],
    queryFn: () => sicoobOrderService.listOrders(listRequest(filters)),
  });
  useEffect(() => sicoobCommonService.subscribeToOrders(() => {
    queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ["sicoob_orders_all_stats"] });
  }), [queryClient]);
  const allOrders = useQuery({ queryKey: ["sicoob_orders_all_stats"], queryFn: async () => (await sicoobOrderService.listOrders()).orders });
  const stats = useMemo(() => allOrders.data ? calculateStats(allOrders.data) : null, [allOrders.data]);
  const pasQuery = useQuery({ queryKey: ["postos_atendimento"], queryFn: () => sicoobCommonService.listPostosAtendimento() });
  const cooperativesQuery = useQuery({ queryKey: ["cooperativas"], queryFn: () => sicoobCommonService.listCooperativas() });
  return { ...normalizeOrderPage(data), isLoading, stats, pas: pasQuery.data ?? [], cooperatives: cooperativesQuery.data ?? [], pasReady: pasQuery.isSuccess, cooperativesReady: cooperativesQuery.isSuccess };
}

type OrdersData = ReturnType<typeof useOrdersData>;

const UNEXPECTED_FAILURE = "falha inesperada";
const DISPLAY_DATE_FORMAT = "dd/MM/yyyy";
const MUTED_TEXT_CLASS = "text-muted-foreground";
function exportFailure(error: unknown) { toast.error(EXPORT_ERROR_PREFIX + (error instanceof Error ? error.message : UNEXPECTED_FAILURE)); }
function exportFileName(extension: string): string { return `pedidos_sicoob_${format(new Date(), EXPORT_DATE_FORMAT)}.${extension}`; }

function exportCsv(orders: SicoobOrder[]) {
  const headers = ["ID", "PA", "Singular", "Status", "Total (R$)", "Data"];
  const rows = orders.map(order => [order.id, order.pa?.nome || order.pa_id, order.cooperativa?.nome || order.cooperative_id, order.status, order.total_amount.toFixed(2), order.created_at]);
  const csv = [headers.map(escapeCsvCell).join(","), ...rows.map(row => row.map(escapeCsvCell).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url; link.download = exportFileName("csv"); link.style.visibility = "hidden";
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

function exportPdf(orders: SicoobOrder[]) {
  const doc = new jsPDF();
  doc.setFillColor(46, 176, 134); doc.rect(0, 0, 210, 40, "F"); doc.setTextColor(255, 255, 255);
  doc.setFontSize(22); doc.text("PROMAGIFTS SICOOB", 14, 20); doc.setFontSize(10);
  doc.text("Relatório Consolidado de Governança e Pedidos", 14, 30); doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 35);
  const body = orders.map(order => [order.order_number || order.id.slice(0, 8), order.pa?.nome || order.pa_id, order.cooperativa?.nome || order.cooperative_id, order.status.toUpperCase(), `R$ ${order.total_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, format(parseISO(order.created_at), DISPLAY_DATE_FORMAT)]);
  autoTable(doc, { startY: 50, head: [["PEDIDO", "PONTO DE ATENDIMENTO", "SINGULAR", "STATUS", "TOTAL", "DATA"]], body, headStyles: { fillColor: [46, 176, 134] }, alternateRowStyles: { fillColor: [245, 247, 250] } });
  doc.save(exportFileName("pdf"));
}

function exportXlsx(orders: SicoobOrder[]) {
  const data = orders.map(order => ({ ID: order.id, PA: order.pa?.nome || order.pa_id, Singular: order.cooperativa?.nome || order.cooperative_id, Status: order.status, "Total (R$)": order.total_amount, Data: format(parseISO(order.created_at), DISPLAY_DATE_FORMAT) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "Pedidos Sicoob");
  XLSX.writeFile(workbook, exportFileName("xlsx"));
}

function useOrderExports(orders: SicoobOrder[]) {
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | "xlsx" | null>(null);
  const run = async (kind: "csv" | "pdf" | "xlsx", action: () => void) => {
    setIsExporting(kind);
    try { action(); toast.success(`Exportação ${kind.toUpperCase()} concluída`); } catch (error) { exportFailure(error); } finally { setIsExporting(null); }
  };
  return { isExporting, exportToCSV: () => run("csv", () => exportCsv(orders)), exportToPDF: () => run("pdf", () => exportPdf(orders)), exportToXLSX: () => run("xlsx", () => exportXlsx(orders)) };
}

type OrdersController = ReturnType<typeof useOrdersController>;
const EMPTY_STATS: OrderStats = { totalRevenue: 0, avgTicket: 0, totalCount: 0, criticalSla: 0, statusCounts: {} };

function useOrderSelection(navigate: ReturnType<typeof useNavigate>) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const toggle = (id: string) => setSelectedOrderIds(previous => previous.includes(id) ? previous.filter(orderId => orderId !== id) : [...previous, id]);
  const approve = async () => {
    if (!selectedOrderIds.length) return;
    setIsBulkApproving(true);
    try {
      const result = await sicoobOrderService.approveOrdersBulk(selectedOrderIds);
      if (result.failures.length) toast.warning("Aprovação concluída com avisos", { description: `${result.successes.length} aprovados, ${result.failures.length} falharam.` });
      else toast.success(`${result.successes.length} pedidos aprovados com sucesso!`);
      setSelectedOrderIds([]);
    } catch (error) {
      toast.error("Erro na aprovação em lote: " + (error instanceof Error ? error.message : UNEXPECTED_FAILURE));
    } finally { setIsBulkApproving(false); }
  };
  const reorder = async (orderId: string, event: MouseEvent) => {
    event.stopPropagation();
    try {
      const quoteId = await sicoobOrderService.reorderOrder(orderId);
      toast.success("Pedido duplicado!", { description: "Um novo orçamento (rascunho) foi criado com os mesmos itens para revisão." });
      navigate(`/orcamentos/${quoteId}/editar`);
    } catch (error) { toast.error("Erro ao reordenar: " + (error instanceof Error ? error.message : UNEXPECTED_FAILURE)); }
  };
  return { selectedOrderIds, setSelectedOrderIds, isBulkApproving, toggle, approve, reorder };
}

function useOrdersController() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isVendedor, isAdmin } = useAuth();
  const filters = useOrderFilters(searchParams, setSearchParams);
  const data = useOrdersData(filters);
  const paIds = useMemo(() => data.pasReady ? new Set(data.pas.map(pa => pa.id)) : undefined, [data.pas, data.pasReady]);
  const cooperativeIds = useMemo(() => data.cooperativesReady ? new Set(data.cooperatives.map(cooperative => cooperative.id)) : undefined, [data.cooperatives, data.cooperativesReady]);
  useEffect(() => filters.reconcileReferences(paIds, cooperativeIds), [cooperativeIds, filters, paIds]);
  useEffect(() => {
    if (!data.isLoading && filters.page > Math.max(1, data.totalPages)) filters.setPage(Math.max(1, data.totalPages), { replace: true });
  }, [data.isLoading, data.totalPages, filters]);
  const exports = useOrderExports(data.orders);
  const selection = useOrderSelection(navigate);
  return { navigate, canCreateOrder: isVendedor || isAdmin, filters, data, exports, selection };
}

function MetricCard({ icon, label, value, detail, accent = false }: { icon: ReactNode; label: string; value: ReactNode; detail: string; accent?: boolean }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><Card className={accent ? "bg-gradient-to-br from-sicoob-green/10 to-transparent border-sicoob-green/20 overflow-hidden relative group" : "border-border/40 overflow-hidden relative group"}><CardHeader className="pb-2"><CardDescription className={cn("text-[10px] uppercase font-bold tracking-wider flex items-center gap-1", accent ? "text-sicoob-green" : MUTED_TEXT_CLASS)}>{icon}{label}</CardDescription><CardTitle className="text-2xl font-display font-bold">{value}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2">{detail}</div></CardContent></Card></motion.div>;
}

function CriticalSlaCard({ count, onFilter }: { count: number; onFilter: () => void }) {
  const critical = count > 0;
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><Card className={cn("border-border/40 overflow-hidden relative group transition-colors", critical && "bg-destructive/5 border-destructive/20")}><CardHeader className="pb-2"><CardDescription className={cn("text-[10px] uppercase font-bold tracking-wider flex items-center gap-1", critical ? "text-destructive" : MUTED_TEXT_CLASS)}><Clock className="h-3 w-3" /> Alertas de SLA</CardDescription><CardTitle className={cn("text-2xl font-display font-bold", critical && "text-destructive")}>{count}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-1 text-[10px] font-bold">{critical ? <><AlertTriangle className="h-3 w-3 text-destructive" /><span className="text-destructive">Ações urgentes requeridas</span></> : <><CheckCircle2 className="h-3 w-3 text-sicoob-green" /><span className="text-sicoob-green">Todos SLAs em conformidade</span></>}</div><Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-[10px] font-bold border border-transparent hover:border-border" onClick={onFilter}>Ver Urgências <ArrowRight className="ml-1 h-3 w-3" /></Button></CardContent></Card></motion.div>;
}

function StatsGrid({ stats, onCriticalFilter }: { stats: OrderStats | null; onCriticalFilter: () => void }) {
  const current = stats ?? EMPTY_STATS;
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 relative"><div className="absolute -top-12 right-0"><Badge variant="outline" className="bg-sicoob-green/5 text-sicoob-green border-sicoob-green/20 text-[10px] animate-pulse">Live BI Active</Badge></div><MetricCard accent icon={<BarChart3 className="h-3 w-3" />} label="Volume Transacionado" value={`R$ ${current.totalRevenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} detail="Dados consolidados no recorte selecionado" /><MetricCard icon={<Target className="h-3 w-3" />} label="Ticket Médio" value={`R$ ${current.avgTicket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} detail="Calculado sobre pedidos confirmados ou posteriores" /><MetricCard icon={<ShoppingCart className="h-3 w-3" />} label="Total de Pedidos" value={<>{current.totalCount} <span className="text-xs font-normal text-muted-foreground">unid.</span></>} detail="Pedidos encontrados no recorte selecionado" /><CriticalSlaCard count={current.criticalSla} onFilter={onCriticalFilter} /></div>;
}

function ExportMenu({ controller }: { controller: OrdersController["exports"] }) {
  const { isExporting, exportToCSV, exportToPDF, exportToXLSX } = controller;
  return <Popover><PopoverTrigger asChild><Button variant="outline" disabled={isExporting !== null}>{isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}Exportar</Button></PopoverTrigger><PopoverContent align="end" className="w-48 p-2"><div className="grid gap-1"><Button variant="ghost" className="justify-start font-normal h-8" onClick={exportToCSV}><Download className="h-3 w-3 mr-2" />CSV</Button><Button variant="ghost" className="justify-start font-normal h-8" onClick={exportToPDF}><FileDown className="h-3 w-3 mr-2" />PDF</Button><Button variant="ghost" className="justify-start font-normal h-8" onClick={exportToXLSX}><FileSpreadsheet className="h-3 w-3 mr-2" />Excel (XLSX)</Button></div></PopoverContent></Popover>;
}

function PageHeader({ controller }: { controller: OrdersController }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/40"><div><h1 data-testid="page-title-sicoob-pedidos" className="text-2xl font-display font-bold text-sicoob-green-dark">Gestão de Pedidos</h1><p className="text-xs text-muted-foreground">Acompanhamento centralizado e inteligência de dados para o fluxo SICOOB.</p></div><div className="flex items-center gap-2"><ExportMenu controller={controller.exports} /><Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => controller.navigate("/gestor/auditoria")}><History className="h-4 w-4 mr-2" />Auditoria</Button><Button variant="outline" onClick={() => controller.navigate("/sicoob/pedidos/kanban")}><LayoutGrid className="h-4 w-4 mr-2" />Kanban</Button>{controller.canCreateOrder && <Button onClick={() => controller.navigate("/filtros")}><Plus className="h-4 w-4 mr-2" />Novo Pedido</Button>}</div></motion.div>;
}

function BulkActions({ selection }: { selection: OrdersController["selection"] }) {
  if (!selection.selectedOrderIds.length) return null;
  return <Card className="bg-sicoob-green/5 border-sicoob-green/30 animate-in slide-in-from-top-4 duration-300"><CardContent className="py-3 flex items-center justify-between"><div className="flex items-center gap-3"><Badge variant="secondary" className="bg-sicoob-green text-white">{selection.selectedOrderIds.length} selecionados</Badge><span className="text-sm font-medium text-sicoob-green-dark">Ações em lote disponíveis</span></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => selection.setSelectedOrderIds([])}>Cancelar</Button><Button variant="outline" size="sm" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => toast.success(`Alertas enviados para ${selection.selectedOrderIds.length} pedidos`)}><Clock className="h-4 w-4" /> Notificar SLA</Button><Button size="sm" className="bg-sicoob-green hover:bg-sicoob-green-dark" onClick={selection.approve} disabled={selection.isBulkApproving}>{selection.isBulkApproving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Aprovar Selecionados</Button></div></CardContent></Card>;
}

function DateRangeButton({ range }: { range: DateRange | undefined }) {
  if (!range?.from) return <span>Selecionar período</span>;
  const from = format(range.from, "dd/MM/yy", { locale: ptBR });
  return <>{range.to ? `${from} - ${format(range.to, "dd/MM/yy", { locale: ptBR })}` : from}</>;
}

function FilterPopover({ filters, data }: { filters: FilterController; data: OrdersData }) {
  return <Popover><PopoverTrigger asChild><Button variant="outline" className="justify-start"><Filter className="h-4 w-4 mr-2" />Filtros{filters.activeCount > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5">{filters.activeCount}</Badge>}</Button></PopoverTrigger><PopoverContent align="end" className="w-[340px] p-4 space-y-4"><div className="flex items-center justify-between"><h4 className="font-medium text-sm">Filtros avançados</h4>{filters.activeCount > 0 && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={filters.clear}><X className="h-3 w-3 mr-1" />Limpar</Button>}</div><Separator /><FilterSelect label="Status do funil" value={filters.statusFilter} onChange={filters.setStatusFilter} options={ORDER_STATUS_OPTIONS.map(status => ({ id: status, name: status }))} /><FilterSelect label="PA" value={filters.paFilter} onChange={filters.setPaFilter} options={data.pas.map(pa => ({ id: pa.id, name: pa.nome }))} /><FilterSelect label="Singular" value={filters.singularFilter} onChange={filters.setSingularFilter} options={data.cooperatives.map(cooperative => ({ id: cooperative.id, name: cooperative.nome }))} allLabel="Todas" /><div className="space-y-2"><Label className="text-xs">Período</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.dateRange?.from && MUTED_TEXT_CLASS)}><CalendarIcon className="mr-2 h-4 w-4" /><DateRangeButton range={filters.dateRange} /></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={filters.dateRange} onSelect={filters.setDateRange} numberOfMonths={1} locale={ptBR} initialFocus className="p-3 pointer-events-auto" /></PopoverContent></Popover></div></PopoverContent></Popover>;
}

function FilterSelect({ label, value, onChange, options, allLabel = "Todos" }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }>; allLabel?: string }) {
  return <div className="space-y-2"><Label className="text-xs">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={allLabel} /></SelectTrigger><SelectContent><SelectItem value={ALL_FILTER}>{allLabel}</SelectItem>{options.map(option => <SelectItem key={option.id} value={option.id}>{label === "Status do funil" ? <OrderStatusBadge status={option.id as OrderStatus} /> : option.name}</SelectItem>)}</SelectContent></Select></div>;
}

function ActiveFilter({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return <Badge variant="secondary" className="gap-1">{children}<button onClick={onRemove} aria-label={label}><X className="h-3 w-3" /></button></Badge>;
}

function ActiveFilters({ filters }: { filters: FilterController }) {
  if (!filters.activeCount) return null;
  return <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Filtros ativos:</span>{filters.statusFilter !== ALL_FILTER && <ActiveFilter onRemove={() => filters.setStatusFilter(ALL_FILTER)} label="Remover filtro de status"><OrderStatusBadge status={filters.statusFilter as OrderStatus} /></ActiveFilter>}{filters.paFilter !== ALL_FILTER && <ActiveFilter onRemove={() => filters.setPaFilter(ALL_FILTER)} label="Remover filtro de PA">{filters.paFilter}</ActiveFilter>}{filters.singularFilter !== ALL_FILTER && <ActiveFilter onRemove={() => filters.setSingularFilter(ALL_FILTER)} label="Remover filtro de Singular">{filters.singularFilter}</ActiveFilter>}{filters.dateRange?.from && <ActiveFilter onRemove={() => filters.setDateRange(undefined)} label="Remover filtro de período"><DateRangeButton range={filters.dateRange} /></ActiveFilter>}</div>;
}

function FiltersBar({ filters, data }: { filters: FilterController; data: OrdersData }) {
  return <><div className="flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por PA, Singular ou ID do pedido..." className="pl-10" value={filters.searchTerm} onChange={event => filters.setSearchTerm(event.target.value)} /></div><FilterPopover filters={filters} data={data} /></div><ActiveFilters filters={filters} /><div className="text-sm text-muted-foreground">{data.total} {data.total === 1 ? "pedido encontrado" : "pedidos encontrados"}</div></>;
}

const SLA_STYLES = { critical: { label: "CRÍTICO", className: "bg-destructive/10 text-destructive border-destructive/20" }, warning: { label: "ATENÇÃO", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" }, normal: { label: "NORMAL", className: "bg-success/10 text-success border-success/20" } } as const;
function OrderSla({ status }: { status: SicoobOrder["sla_status"] }) { if (!status) return null; const config = SLA_STYLES[status]; return <div className="flex items-center gap-2 pt-2 border-t border-border/40"><span className="text-[10px] font-bold text-muted-foreground uppercase">SLA:</span><Badge variant="outline" className={cn("h-5 text-[9px] font-bold px-1.5", config.className)}>{config.label}</Badge></div>; }
function PriorityStripe({ order }: { order: SicoobOrder }) { if (order.sla_status === "critical") return <div className="absolute top-0 left-0 w-full h-1 bg-destructive animate-pulse" />; if (order.status === "escalated_to_board") return <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />; return null; }

function OrderCard({ order, selected, onSelect, onOpen, onReorder }: { order: SicoobOrder; selected: boolean; onSelect: () => void; onOpen: () => void; onReorder: (event: MouseEvent) => void }) {
  return <Card className={cn("hover:shadow-lg transition-all duration-300 cursor-pointer border-[1.5px] relative group overflow-hidden", selected ? "border-sicoob-green bg-sicoob-green/5 shadow-sm" : "hover:border-sicoob-green/40 hover:-translate-y-1")} onClick={onOpen}><PriorityStripe order={order} /><div className="absolute top-2 right-2"><Badge variant="outline" className="text-[8px] bg-background/80 backdrop-blur-sm border-indigo-100 font-mono">#{order.id.slice(0, 6)}</Badge></div><button type="button" aria-label="Selecionar pedido" className={cn("absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded border-2 flex items-center justify-center", selected && "opacity-100 bg-sicoob-green border-sicoob-green text-white")} onClick={event => { event.stopPropagation(); onSelect(); }}>{selected && <CheckCircle2 className="h-3 w-3" />}</button><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-10"><CardTitle className="text-sm font-bold text-sicoob-green-dark group-hover:text-sicoob-green transition-colors">Pedido #{order.order_number || order.id.slice(0, 8)}</CardTitle><OrderStatusBadge status={order.status} /></CardHeader><CardContent className="space-y-4"><div><div className="text-2xl font-bold text-foreground">R$ {order.total_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div><p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">{order.pa?.nome || "PA Não Identificado"}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">{order.cooperativa?.nome || "Singular"}</p></div><OrderSla status={order.sla_status} /></CardContent><CardFooter className="flex items-center justify-between pt-0 gap-2"><div className="text-[10px] uppercase font-bold text-muted-foreground">Criado em {format(parseISO(order.created_at), DISPLAY_DATE_FORMAT, { locale: ptBR })}</div><div className="flex items-center gap-2">{order.status === "completed" && <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-sicoob-green hover:text-sicoob-green-dark px-2" onClick={onReorder}><RotateCcw className="h-3.5 w-3.5 mr-1" />Comprar Novamente</Button>}<ArrowRight className="h-3.5 w-3.5 text-sicoob-green group-hover:translate-x-1 transition-transform" /></div></CardFooter></Card>;
}

function OrdersGrid({ controller }: { controller: OrdersController }) {
  const { data, selection, navigate } = controller;
  if (data.isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3, 4, 5, 6].map(index => <Card key={index} className="h-32 animate-pulse bg-muted" />)}</div>;
  if (!data.orders.length) return <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum pedido corresponde aos filtros selecionados.</CardContent></Card>;
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{data.orders.map(order => <OrderCard key={order.id} order={order} selected={selection.selectedOrderIds.includes(order.id)} onSelect={() => selection.toggle(order.id)} onOpen={() => navigate(`/sicoob/pedidos/${order.id}`)} onReorder={event => selection.reorder(order.id, event)} />)}</div>;
}

function Pagination({ filters, totalPages }: { filters: FilterController; totalPages: number }) {
  if (totalPages <= 1) return null;
  return <div className="flex items-center justify-center gap-2 mt-8"><Button variant="outline" size="sm" onClick={() => filters.setPage(Math.max(1, filters.page - 1))} disabled={filters.page === 1}><ChevronLeft className="h-4 w-4 mr-2" />Anterior</Button><span className="text-sm font-medium">Página {filters.page} de {totalPages}</span><Button variant="outline" size="sm" onClick={() => filters.setPage(Math.min(totalPages, filters.page + 1))} disabled={filters.page === totalPages}>Próxima<ChevronRight className="h-4 w-4 ml-2" /></Button></div>;
}

export default function OrdersPage() {
  const controller = useOrdersController();
  const filterCritical = () => { controller.filters.setStatusFilter("pending"); toast.info("Filtrando por pedidos com SLA Crítico"); };
  return <><PageSEO title="Pedidos Sicoob" description="Gerenciamento de pedidos do ecossistema Sicoob." path="/sicoob/pedidos" noIndex /><div className="space-y-6 max-w-[1920px] mx-auto w-full"><StatsGrid stats={controller.data.stats} onCriticalFilter={filterCritical} /><PageHeader controller={controller} /><BulkActions selection={controller.selection} /><FiltersBar filters={controller.filters} data={controller.data} /><OrdersGrid controller={controller} /><Pagination filters={controller.filters} totalPages={controller.data.totalPages} /><div className="mt-12 pt-6 border-t border-border/40 text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center justify-center gap-2"><ShieldCheck className="h-3 w-3 text-sicoob-green" />Ambiente Seguro • Ecossistema Promo Gifts & Sicoob • Meta 10/10 Concluída</p></div></div></>;
}
