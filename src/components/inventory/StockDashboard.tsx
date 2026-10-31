import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Package, TrendingDown, RefreshCw, Truck, CheckCircle2, XCircle, Palette, Loader2, AlertCircle, X,
  ChevronDown, ChevronRight, Clock, BarChart3, Shield, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useVariantStock } from "@/hooks/useVariantStock";
import { VariantStockTable } from "./VariantStockTable";
import { SupplierRiskPanel } from "./SupplierRiskPanel";
import { StatCard } from "./StockStatCard";
import { AlertCard } from "./StockAlertCard";
import { OutOfStockDialog, LowStockDialog } from "./StockAlertDialogs";
import { StockFilterToolbar } from "./StockFilterToolbar";
import { FutureStockDialog } from "./FutureStockDialog";

type StockState = ReturnType<typeof useVariantStock>;

function StockLoadingState({ loadingProgress }: Pick<StockState, 'loadingProgress'>) {
  const percent = loadingProgress ? Math.round((loadingProgress.current / loadingProgress.total) * 100) : 0;
  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Package className="h-4 w-4 text-primary animate-pulse" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium truncate">Sincronizando estoque</p>
            {loadingProgress && <p className="text-xs font-medium tabular-nums text-primary flex-shrink-0">{percent}%</p>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500 ease-out" style={{ width: `${percent || 8}%` }} /></div>
            <p className="text-xs text-muted-foreground truncate max-w-[40%]">{loadingProgress?.step ?? 'Conectando ao fornecedor...'}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}</div>
      <Skeleton className="h-12 rounded-xl" /><Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

interface DashboardHeaderProps {
  healthScore: number;
  summary: StockState['summary'];
  criticalAlertsCount: number;
  isFetching: boolean;
  lastRefresh: Date;
  openCriticalAlerts: () => void;
}

function DashboardHeader({ healthScore, summary, criticalAlertsCount, isFetching, lastRefresh, openCriticalAlerts }: DashboardHeaderProps) {
  const healthClass = cn(
    "gap-1 text-xs font-semibold",
    healthScore >= 80 && "bg-success/10 border-success/20 text-success",
    healthScore >= 50 && healthScore < 80 && "bg-warning/10 border-warning/20 text-warning",
    healthScore < 50 && "bg-destructive/10 border-destructive/20 text-destructive",
  );
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Visão Geral</h2>
        <TooltipProvider><Tooltip><TooltipTrigger><Badge variant="outline" className={healthClass}><Shield className="h-3 w-3" />Saúde: {healthScore}%</Badge></TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Índice de saúde do estoque: {summary.productsInStock} de {summary.totalProducts} produtos com estoque adequado.{healthScore < 50 && ' ⚠️ Atenção: muitos produtos precisam de reposição.'}</p></TooltipContent></Tooltip></TooltipProvider>
        {criticalAlertsCount > 0 && <Badge variant="destructive" className="gap-1 text-xs animate-pulse cursor-pointer" onClick={openCriticalAlerts}><AlertCircle className="h-3 w-3" />{criticalAlertsCount} alertas</Badge>}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{lastRefresh.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}{isFetching && <Loader2 className="h-3 w-3 animate-spin text-primary" />}</div>
    </div>
  );
}

interface SummaryCardProps {
  stock: StockState;
  openLowStock: () => void;
  openOutOfStock: () => void;
  openFutureStock: () => void;
  futureStockTotal: number;
}

function TotalStockCard({ stock }: Pick<SummaryCardProps, 'stock'>) {
  return <StatCard title="Total de Produtos" value={stock.summary.totalProducts.toLocaleString('pt-BR')} icon={<Package className="h-6 w-6 text-primary" />} isActive={stock.filters.status === 'all'} onClick={() => stock.updateFilter('status', 'all')} clickHint="Mostrar todos os produtos" trend={{ value: stock.summary.totalVariants, label: `${stock.summary.totalVariants.toLocaleString('pt-BR')} variações` }} />;
}

function InStockCard({ stock }: Pick<SummaryCardProps, 'stock'>) {
  const percent = stock.summary.totalProducts > 0 ? Math.round((stock.summary.productsInStock / stock.summary.totalProducts) * 100) : null;
  return <StatCard title="Em Estoque" value={stock.summary.productsInStock.toLocaleString('pt-BR')} icon={<CheckCircle2 className="h-6 w-6 text-success" />} variant="success" isActive={stock.filters.status === 'in_stock'} onClick={() => stock.updateFilter('status', stock.filters.status === 'in_stock' ? 'all' : 'in_stock')} clickHint="Filtrar produtos em estoque" trend={percent === null ? undefined : { value: 1, label: `${percent}% do total` }} />;
}

function LowStockCard({ stock, openLowStock }: Pick<SummaryCardProps, 'stock' | 'openLowStock'>) {
  const handleClick = () => {
    stock.updateFilter('status', stock.filters.status === 'low_stock' ? 'all' : 'low_stock');
    if (stock.alerts.some((alert) => alert.severity === 'warning')) openLowStock();
  };
  return <StatCard title="Estoque Baixo" value={(stock.summary.productsLowStock + stock.summary.productsCritical).toLocaleString('pt-BR')} icon={<TrendingDown className="h-6 w-6 text-warning" />} variant="warning" isActive={stock.filters.status === 'low_stock' || stock.filters.status === 'critical'} onClick={handleClick} clickHint="Filtrar produtos com estoque baixo" trend={stock.summary.productsCritical > 0 ? { value: -1, label: `${stock.summary.productsCritical} críticos` } : undefined} />;
}

function OutOfStockCard({ stock, openOutOfStock }: Pick<SummaryCardProps, 'stock' | 'openOutOfStock'>) {
  const handleClick = () => {
    stock.updateFilter('status', stock.filters.status === 'out_of_stock' ? 'all' : 'out_of_stock');
    if (stock.criticalAlerts.length > 0) openOutOfStock();
  };
  return <StatCard title="Sem Estoque" value={stock.summary.productsOutOfStock.toLocaleString('pt-BR')} icon={<XCircle className="h-6 w-6 text-destructive" />} variant="error" isActive={stock.filters.status === 'out_of_stock'} onClick={handleClick} clickHint="Filtrar produtos sem estoque" trend={stock.summary.criticalAlerts > 0 ? { value: -1, label: `${stock.summary.criticalAlerts} alertas ativos` } : undefined} />;
}

function IncomingStockCard({ stock, openFutureStock, futureStockTotal }: Pick<SummaryCardProps, 'stock' | 'openFutureStock' | 'futureStockTotal'>) {
  const handleClick = () => {
    stock.updateFilter('status', stock.filters.status === 'incoming' ? 'all' : 'incoming');
    if (stock.futureStock.length > 0) openFutureStock();
  };
  return <StatCard title="Estoque Futuro" value={futureStockTotal} icon={<Truck className="h-6 w-6 text-primary" />} isActive={stock.filters.status === 'incoming'} onClick={handleClick} clickHint="Ver previsões de reposição" trend={stock.futureStock.length > 0 ? { value: 1, label: `${stock.futureStock.length} reposições previstas` } : undefined} />;
}

function SummaryCards(props: SummaryCardProps) {
  return <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3"><TotalStockCard stock={props.stock} /><InStockCard stock={props.stock} /><LowStockCard stock={props.stock} openLowStock={props.openLowStock} /><OutOfStockCard stock={props.stock} openOutOfStock={props.openOutOfStock} /><IncomingStockCard stock={props.stock} openFutureStock={props.openFutureStock} futureStockTotal={props.futureStockTotal} /></div>;
}

function ActiveStatusFilter({ stock, label }: { stock: StockState; label: string | null }) {
  if (stock.filters.status === 'all') return null;
  return (
    <div className="flex items-center gap-2 animate-fade-in">
      <span className="text-sm text-muted-foreground">Filtro ativo:</span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm font-medium text-primary">
        {label}<button type="button" onClick={() => stock.updateFilter('status', 'all')} className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors" aria-label="Remover filtro"><X className="h-3.5 w-3.5" /></button>
      </span>
      <span className="text-xs text-muted-foreground">({stock.productStocks.length} de {stock.allProductStocks.length} produtos)</span>
    </div>
  );
}

function StockFiltersCard({ stock }: { stock: StockState }) {
  return (
    <Card><CardContent className="p-4"><StockFilterToolbar
      filters={stock.filters} onUpdateFilter={stock.updateFilter} onResetFilters={stock.resetFilters}
      categories={stock.availableCategories} suppliers={stock.availableSuppliers} colors={stock.allColors}
      colorGroups={stock.availableColorGroups} totalProducts={stock.allProductStocks.length}
      filteredCount={stock.productStocks.length} alertTypes={stock.availableAlertTypes}
      currentAlertFilter={stock.alertTypeFilter} onUpdateAlertFilter={stock.setAlertTypeFilter}
    /></CardContent></Card>
  );
}

interface StockTableCardProps {
  stock: StockState;
  isFiltered: boolean;
  onExport: () => void;
}

function StockTableCard({ stock, isFiltered, onExport }: StockTableCardProps) {
  const countLabel = isFiltered ? `${stock.productStocks.length} de ${stock.allProductStocks.length}` : `${stock.productStocks.length} produtos`;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-5 w-5" />Estoque por Cor/Variação<Badge variant="secondary" className="text-xs font-normal ml-1">{countLabel}</Badge></CardTitle>
            <CardDescription className="mt-1">Visualização detalhada do estoque segmentado por cores e variações</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" onClick={onExport} disabled={stock.productStocks.length === 0} className="gap-1.5" aria-label="Exportar estoque em CSV"><Download className="h-4 w-4" /><span className="hidden sm:inline">Exportar</span></Button></TooltipTrigger><TooltipContent><p className="text-xs">Exportar dados filtrados em CSV</p></TooltipContent></Tooltip></TooltipProvider>
            <Button variant="outline" size="sm" onClick={stock.fetchStockData} disabled={stock.isFetching} className="gap-1.5" aria-label="Atualizar dados de estoque"><RefreshCw className={cn("h-4 w-4", stock.isFetching && "animate-spin")} />{stock.isFetching ? 'Atualizando...' : 'Atualizar'}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0"><ScrollArea className="h-[min(600px,_60vh)]"><VariantStockTable products={stock.productStocks} /></ScrollArea></CardContent>
    </Card>
  );
}

function SupplierRiskSection({ products, open, setOpen }: { products: StockState['allProductStocks']; open: boolean; setOpen: (open: boolean) => void }) {
  return (
    <div className="space-y-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<BarChart3 className="h-4 w-4" />Painel de Risco do Fornecedor
      </button>
      {open && <SupplierRiskPanel products={products} />}
    </div>
  );
}

function InfoAlerts({ stock }: { stock: StockState }) {
  const alerts = stock.alerts.filter((alert) => alert.severity === 'info');
  if (alerts.length === 0) return null;
  return (
    <Card>
      <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><AlertCircle className="h-5 w-5" />Outros Alertas ({alerts.length})</CardTitle><Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1.5" onClick={() => stock.dismissAlertsBySeverity('info')}><XCircle className="h-3.5 w-3.5" />Limpar Todos</Button></div></CardHeader>
      <CardContent><ScrollArea className="max-h-60"><div className="space-y-2">{alerts.slice(0, 10).map((alert) => <AlertCard key={alert.id} alert={alert} onDismiss={() => stock.dismissAlert(alert.id)} />)}</div></ScrollArea></CardContent>
    </Card>
  );
}

function stockStatusLabel(status: StockState["filters"]["status"]) {
  const labels: Partial<Record<StockState["filters"]["status"], string>> = { in_stock: "Em Estoque", low_stock: "Estoque Baixo", critical: "Estoque Crítico", out_of_stock: "Sem Estoque", incoming: "Estoque Futuro" };
  return labels[status] ?? null;
}

function exportStockCsv(products: StockState["productStocks"]) {
  const data = products.flatMap((product) => product.variants.map((variant) => ({ produto: product.productName, sku: product.productSku, cor: variant.colorName || "Sem cor", sku_variante: variant.variantSku, estoque_atual: variant.currentStock, estoque_minimo: variant.minStock, reservado: variant.reservedStock, disponivel: variant.availableStock, em_transito: variant.inTransitStock, status: variant.status, dias_ate_esgotamento: variant.daysUntilStockout ?? "" })));
  const firstRow = data[0];
  if (!firstRow) return 0;
  const headers = Object.keys(firstRow);
  const csv = [headers.join(";"), ...data.map((row) => headers.map((header) => row[header as keyof typeof row]).join(";"))].join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a"); link.href = url; link.download = `estoque_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
  URL.revokeObjectURL(url);
  return data.length;
}

function useStockActivity(stock: StockState) {
  const { toast } = useToast();
  const { isFetching, isLoading, fetchStockData, criticalAlerts, productStocks } = stock;
  const previousCriticalCount = useRef<number | null>(null);
  const lastRefresh = useRef(new Date());
  useEffect(() => { if (!isFetching) lastRefresh.current = new Date(); }, [isFetching]);
  const refresh = useCallback(() => { if (!isFetching && !isLoading) fetchStockData(); }, [isFetching, isLoading, fetchStockData]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "R") { event.preventDefault(); refresh(); toast({ title: "🔄 Atualizando estoque...", description: "Atalho: Ctrl+Shift+R" }); } };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [refresh, toast]);
  useEffect(() => {
    if (isLoading) return;
    const count = criticalAlerts.length;
    if (previousCriticalCount.current !== null && count > previousCriticalCount.current) { const added = count - previousCriticalCount.current; toast({ title: `⚠️ ${added} novo${added > 1 ? "s" : ""} alerta${added > 1 ? "s" : ""} crítico${added > 1 ? "s" : ""}`, description: "Produtos sem estoque ou em nível crítico detectados.", variant: "destructive" }); }
    previousCriticalCount.current = count;
  }, [criticalAlerts.length, isLoading, toast]);
  const exportCsv = () => { const count = exportStockCsv(productStocks); if (count > 0) toast({ title: "📊 Exportação concluída", description: `${count} registros exportados.` }); };
  return { lastRefresh: lastRefresh.current, exportCsv };
}

function StockDialogs({ stock, outOpen, setOutOpen, lowOpen, setLowOpen, futureOpen, setFutureOpen, warningAlerts }: { stock: StockState; outOpen: boolean; setOutOpen: (open: boolean) => void; lowOpen: boolean; setLowOpen: (open: boolean) => void; futureOpen: boolean; setFutureOpen: (open: boolean) => void; warningAlerts: StockState["alerts"] }) {
  return <><OutOfStockDialog open={outOpen} onOpenChange={setOutOpen} alerts={stock.criticalAlerts} onDismiss={stock.dismissAlert} onDismissAll={() => stock.dismissAlertsBySeverity("error")} /><LowStockDialog open={lowOpen} onOpenChange={setLowOpen} alerts={warningAlerts} onDismiss={stock.dismissAlert} onDismissAll={() => stock.dismissAlertsBySeverity("warning")} /><FutureStockDialog open={futureOpen} onOpenChange={setFutureOpen} entries={stock.futureStock} /></>;
}

interface DashboardContentProps {
  stock: StockState;
  activity: ReturnType<typeof useStockActivity>;
  healthScore: number;
  activeFilterLabel: string | null;
  futureStockTotal: number;
  dialogs: { outOpen: boolean; setOutOpen: (open: boolean) => void; lowOpen: boolean; setLowOpen: (open: boolean) => void; futureOpen: boolean; setFutureOpen: (open: boolean) => void };
  riskPanelOpen: boolean;
  setRiskPanelOpen: (open: boolean) => void;
}

function DashboardContent({ stock, activity, healthScore, activeFilterLabel, futureStockTotal, dialogs, riskPanelOpen, setRiskPanelOpen }: DashboardContentProps) {
  const warningAlerts = stock.alerts.filter((alert) => alert.severity === "warning");
  return <div className="space-y-5"><StockDialogs stock={stock} outOpen={dialogs.outOpen} setOutOpen={dialogs.setOutOpen} lowOpen={dialogs.lowOpen} setLowOpen={dialogs.setLowOpen} futureOpen={dialogs.futureOpen} setFutureOpen={dialogs.setFutureOpen} warningAlerts={warningAlerts} /><DashboardHeader healthScore={healthScore} summary={stock.summary} criticalAlertsCount={stock.criticalAlerts.length} isFetching={stock.isFetching} lastRefresh={activity.lastRefresh} openCriticalAlerts={() => dialogs.setOutOpen(true)} /><SummaryCards stock={stock} openLowStock={() => dialogs.setLowOpen(true)} openOutOfStock={() => dialogs.setOutOpen(true)} openFutureStock={() => dialogs.setFutureOpen(true)} futureStockTotal={futureStockTotal} /><ActiveStatusFilter stock={stock} label={activeFilterLabel} /><StockFiltersCard stock={stock} /><StockTableCard stock={stock} isFiltered={stock.filters.status !== "all"} onExport={activity.exportCsv} /><SupplierRiskSection products={stock.allProductStocks} open={riskPanelOpen} setOpen={setRiskPanelOpen} /><InfoAlerts stock={stock} /></div>;
}

export function StockDashboard() {
  const [outOfStockDialogOpen, setOutOfStockDialogOpen] = useState(false);
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false);
  const [futureStockDialogOpen, setFutureStockDialogOpen] = useState(false);
  const [riskPanelOpen, setRiskPanelOpen] = useState(true);
  const stock = useVariantStock();
  const activity = useStockActivity(stock);
  const healthScore = useMemo(() => stock.summary.totalProducts === 0 ? 100 : Math.round((stock.summary.productsInStock / stock.summary.totalProducts) * 100), [stock.summary]);
  const futureStockTotal = useMemo(() => stock.futureStock.reduce((sum, entry) => sum + (entry.expectedQuantity || 0), 0), [stock.futureStock]);
  if (stock.isLoading) return <StockLoadingState loadingProgress={stock.loadingProgress} />;
  const dialogs = { outOpen: outOfStockDialogOpen, setOutOpen: setOutOfStockDialogOpen, lowOpen: lowStockDialogOpen, setLowOpen: setLowStockDialogOpen, futureOpen: futureStockDialogOpen, setFutureOpen: setFutureStockDialogOpen };
  return <DashboardContent stock={stock} activity={activity} healthScore={healthScore} activeFilterLabel={stockStatusLabel(stock.filters.status)} futureStockTotal={futureStockTotal} dialogs={dialogs} riskPanelOpen={riskPanelOpen} setRiskPanelOpen={setRiskPanelOpen} />;
}

export default StockDashboard;
