import { useState, useMemo } from "react";
import {
  Truck, Search, Calendar, Package, CheckCircle2,
  Clock, ArrowUpDown, X, TrendingUp, AlertCircle,
  CalendarDays, Boxes, MapPin, FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FutureStockEntry } from "@/types/stock";

interface FutureStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: FutureStockEntry[];
}

type SortField = 'date' | 'quantity' | 'product' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'in_transit';
type DateRange = 'all' | '7d' | '15d' | '30d' | '60d' | '90d';
type ViewMode = 'list' | 'timeline';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: 'Confirmado', color: 'text-success', bgColor: 'bg-success/10 border-success/20', icon: CheckCircle2 },
  pending: { label: 'Pendente', color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20', icon: Clock },
  in_transit: { label: 'Em Trânsito', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20', icon: Truck },
  partial: { label: 'Parcial', color: 'text-muted-foreground', bgColor: 'bg-muted/50 border-border', icon: AlertCircle },
};
const DEFAULT_STATUS_CONFIG = STATUS_CONFIG.pending as NonNullable<(typeof STATUS_CONFIG)[string]>;

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'Todas as datas',
  '7d': 'Próx. 7 dias',
  '15d': 'Próx. 15 dias',
  '30d': 'Próx. 30 dias',
  '60d': 'Próx. 60 dias',
  '90d': 'Próx. 90 dias',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDaysLabel(days: number): { text: string; urgency: 'ok' | 'soon' | 'imminent' | 'overdue' } {
  if (days < 0) return { text: `${Math.abs(days)}d atrasado`, urgency: 'overdue' };
  if (days === 0) return { text: 'Hoje', urgency: 'imminent' };
  if (days <= 3) return { text: `${days}d`, urgency: 'imminent' };
  if (days <= 7) return { text: `${days}d`, urgency: 'soon' };
  return { text: `${days}d`, urgency: 'ok' };
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return '⚠️ Atrasado';
  if (diffDays <= 7) return '📦 Esta Semana';
  if (diffDays <= 14) return '📅 Próxima Semana';
  if (diffDays <= 30) return '🗓️ Este Mês';
  if (diffDays <= 60) return '📆 Próximos 2 Meses';
  return '🔮 Longo Prazo';
}

// ============================================
// KPI CARD
// ============================================
function KpiCard({ label, value, sub, icon, variant = 'default' }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Package;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const IconComponent = icon;
  const styles = {
    default: 'bg-muted/50 border-border',
    primary: 'bg-primary/5 border-primary/15',
    success: 'bg-success/5 border-success/15',
    warning: 'bg-warning/5 border-warning/15',
  };
  const iconStyles = {
    default: 'text-muted-foreground bg-muted/50',
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
  };

  return (
    <div className={cn("rounded-xl border p-3 transition-all hover:shadow-sm", styles[variant])}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", iconStyles[variant])}>
          <IconComponent className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ============================================
// ENTRY ROW
// ============================================
function EntryRow({ entry }: { entry: FutureStockEntry }) {
  const days = daysUntil(entry.expectedDate);
  const daysInfo = getDaysLabel(days);
  const statusConf = STATUS_CONFIG[entry.status] ?? DEFAULT_STATUS_CONFIG;
  const StatusIcon = statusConf.icon;

  return (
    <div
      className={entryRowClass(daysInfo.urgency)}
    >
      {/* Product */}
      <EntryProduct entry={entry} />

      {/* Quantity */}
      <div className="flex items-center">
        <span className="text-sm font-bold tabular-nums text-primary">
          +{entry.expectedQuantity.toLocaleString('pt-BR')}
        </span>
      </div>

      {/* Date */}
      <div className="flex flex-col justify-center">
        <span className="text-xs text-foreground">{formatDate(entry.expectedDate)}</span>
        {entry.orderDate && (
          <span className="text-[10px] text-muted-foreground">Pedido: {formatShortDate(entry.orderDate)}</span>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center">
        <Badge variant="outline" className={cn("text-[10px] gap-1 px-1.5 py-0.5", statusConf.bgColor, statusConf.color)}>
          <StatusIcon className="h-2.5 w-2.5" />
          {statusConf.label}
        </Badge>
      </div>

      {/* Days until */}
      <EntryDays days={days} expectedDate={entry.expectedDate} info={daysInfo} />
    </div>
  );
}

function entryRowClass(urgency: ReturnType<typeof getDaysLabel>["urgency"]) {
  const urgencyClass = { overdue: "border-destructive/30 bg-destructive/5", imminent: "border-primary/30 bg-primary/5", soon: "border-warning/20 bg-warning/5", ok: "border-border" }[urgency];
  return cn("grid grid-cols-[1fr_90px_110px_100px_70px] gap-2 px-3 py-2.5 rounded-md border transition-all duration-200", "hover:bg-muted/40 hover:shadow-sm", urgencyClass);
}

function EntryProduct({ entry }: { entry: FutureStockEntry }) {
  return <div className="min-w-0"><p className="text-sm font-medium truncate" title={entry.productName}>{entry.productName || "Produto"}</p><div className="flex items-center gap-1.5 mt-0.5 flex-wrap">{entry.productSku && <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">{entry.productSku}</span>}{entry.colorName && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{entry.colorName}</Badge>}{entry.supplierName && <TooltipProvider><Tooltip><TooltipTrigger><span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{entry.supplierName}</span></TooltipTrigger><TooltipContent><p className="text-xs">Fornecedor: {entry.supplierName}</p></TooltipContent></Tooltip></TooltipProvider>}</div></div>;
}

function EntryDays({ days, expectedDate, info }: { days: number; expectedDate: string; info: ReturnType<typeof getDaysLabel> }) {
  const tooltip = days < 0 ? `Atrasado há ${Math.abs(days)} dia(s)` : days === 0 ? "Previsto para hoje" : `Chega em ${days} dia(s) — ${formatDate(expectedDate)}`;
  const urgencyClass = { overdue: "text-destructive bg-destructive/10", imminent: "text-primary bg-primary/10", soon: "text-warning bg-warning/10", ok: "text-muted-foreground" }[info.urgency];
  return <div className="flex items-center justify-end"><TooltipProvider><Tooltip><TooltipTrigger><span className={cn("text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded", urgencyClass)}>{info.text}</span></TooltipTrigger><TooltipContent><p className="text-xs">{tooltip}</p></TooltipContent></Tooltip></TooltipProvider></div>;
}

// ============================================
// TIMELINE VIEW
// ============================================
function TimelineView({ entries }: { entries: FutureStockEntry[] }) {
  const grouped = useMemo(() => {
    const groups = new Map<string, FutureStockEntry[]>();
    for (const e of entries) {
      const label = getWeekLabel(e.expectedDate);
      const group = groups.get(label) ?? [];
      group.push(e);
      groups.set(label, group);
    }
    return Array.from(groups.entries());
  }, [entries]);

  return (
    <div className="space-y-4">
      {grouped.map(([label, groupEntries]) => {
        const totalQty = groupEntries.reduce((s, e) => s + e.expectedQuantity, 0);
        return (
          <div key={label}>
            <div className="flex items-center justify-between mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-[1]">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                {label}
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {groupEntries.length} {groupEntries.length === 1 ? 'reposição' : 'reposições'}
                </Badge>
              </h4>
              <span className="text-xs font-medium text-primary tabular-nums">
                +{totalQty.toLocaleString('pt-BR')} un.
              </span>
            </div>
            <div className="space-y-1 pl-2 border-l-2 border-primary/20 ml-2">
              {groupEntries.map(entry => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface FutureStats {
  totalUnits: number;
  confirmedUnits: number;
  inTransitUnits: number;
  uniqueProducts: number;
  nextDate: string | null;
  total: number;
  overdueCount: number;
}

function FutureSummary({ stats }: { stats: FutureStats }) {
  const nextArrival = stats.nextDate ? getDaysLabel(daysUntil(stats.nextDate)).text : "-";
  const nextDate = stats.nextDate ? formatDate(stats.nextDate) : "sem previsão";
  return <div className="grid grid-cols-2 md:grid-cols-5 gap-2"><KpiCard label="Total Previsto" value={stats.totalUnits} sub={`${stats.total} reposições`} icon={Boxes} variant="primary" /><KpiCard label="Confirmado" value={stats.confirmedUnits} sub="unidades" icon={CheckCircle2} variant="success" /><KpiCard label="Em Trânsito" value={stats.inTransitUnits} sub="a caminho" icon={Truck} variant="primary" /><KpiCard label="Produtos" value={stats.uniqueProducts} sub="com reposição" icon={Package} /><KpiCard label="Próx. Chegada" value={nextArrival} sub={nextDate} icon={CalendarDays} variant={stats.overdueCount > 0 ? "warning" : "default"} /></div>;
}

function ConfirmationProgress({ stats }: { stats: FutureStats }) {
  if (stats.totalUnits <= 0) return null;
  const confirmedPercentage = (stats.confirmedUnits / stats.totalUnits) * 100;
  const transitPercentage = (stats.inTransitUnits / stats.totalUnits) * 100;
  return <div className="space-y-1.5"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Confirmação de Reposição</span><span className="font-medium tabular-nums text-success">{Math.round(confirmedPercentage)}% confirmado</span></div><div className="h-2 bg-muted rounded-full overflow-hidden flex"><div className="h-full bg-success rounded-l-full transition-all duration-500" style={{ width: `${confirmedPercentage}%` }} /><div className="h-full bg-primary/60 transition-all duration-500" style={{ width: `${transitPercentage}%` }} /></div><div className="flex items-center gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />Confirmado</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/60" />Em trânsito</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted" />Pendente</span></div></div>;
}

function OverdueAlert({ count }: { count: number }) {
  if (count <= 0) return null;
  return <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"><AlertCircle className="h-4 w-4 shrink-0" /><span><strong>{count}</strong> {count === 1 ? "reposição atrasada" : "reposições atrasadas"} — verifique com o fornecedor.</span></div>;
}

interface FutureFiltersProps {
  search: string;
  status: StatusFilter;
  dateRange: DateRange;
  viewMode: ViewMode;
  activeCount: number;
  setSearch: (value: string) => void;
  setStatus: (value: StatusFilter) => void;
  setDateRange: (value: DateRange) => void;
  setViewMode: (value: ViewMode) => void;
  onClear: () => void;
}

function FutureFilters({ search, status, dateRange, viewMode, activeCount, setSearch, setStatus, setDateRange, setViewMode, onClear }: FutureFiltersProps) {
  return <div className="flex flex-wrap items-center gap-2"><div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar produto, SKU, cor ou fornecedor..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9 h-9" />{search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}</div><Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}><SelectTrigger className="w-[145px] h-9"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="confirmed">Confirmado</SelectItem><SelectItem value="in_transit">Em Trânsito</SelectItem><SelectItem value="pending">Pendente</SelectItem></SelectContent></Select><Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}><SelectTrigger className="w-[145px] h-9"><Calendar className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Período" /></SelectTrigger><SelectContent>{Object.entries(DATE_RANGE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><div className="flex items-center rounded-md border bg-muted/30 p-0.5"><Button variant={viewMode === "timeline" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2.5" onClick={() => setViewMode("timeline")}><CalendarDays className="h-3.5 w-3.5 mr-1" />Timeline</Button><Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2.5" onClick={() => setViewMode("list")}><FileText className="h-3.5 w-3.5 mr-1" />Lista</Button></div>{activeCount > 0 && <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs" onClick={onClear}><X className="h-3.5 w-3.5" /> Limpar ({activeCount})</Button>}</div>;
}

function EntriesList({ entries, sortField, onSort }: { entries: FutureStockEntry[]; sortField: SortField; onSort: (field: SortField) => void }) {
  const heading = (field: SortField, label: string) => <button type="button" onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">{label} {sortField === field && <ArrowUpDown className="h-3 w-3" />}</button>;
  return <div className="space-y-1"><div className="grid grid-cols-[1fr_90px_110px_100px_70px] gap-2 px-3 py-2 bg-muted/30 rounded-md text-xs font-medium text-muted-foreground sticky top-0 z-[1]">{heading("product", "Produto")}{heading("quantity", "Qtd.")}{heading("date", "Previsão")}{heading("status", "Status")}<span className="text-right">Tempo</span></div>{entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)}</div>;
}

function FutureEntries({ entries, activeFilters, viewMode, sortField, onSort, onClear }: { entries: FutureStockEntry[]; activeFilters: number; viewMode: ViewMode; sortField: SortField; onSort: (field: SortField) => void; onClear: () => void }) {
  if (entries.length > 0) return <ScrollArea className="flex-1 max-h-[45vh]">{viewMode === "timeline" ? <TimelineView entries={entries} /> : <EntriesList entries={entries} sortField={sortField} onSort={onSort} />}</ScrollArea>;
  const message = activeFilters > 0 ? "Nenhum resultado para os filtros aplicados. Tente ajustar os critérios." : "Não há reposições previstas no momento. Novas entradas aparecerão aqui quando registradas.";
  return <ScrollArea className="flex-1 max-h-[45vh]"><div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4"><Package className="h-8 w-8 opacity-40" /></div><p className="font-semibold text-foreground mb-1">Nenhuma reposição encontrada</p><p className="text-sm text-center max-w-xs">{message}</p>{activeFilters > 0 && <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={onClear}><X className="h-3.5 w-3.5" /> Limpar filtros</Button>}</div></ScrollArea>;
}

function FutureFooter({ entries, totalCount, stats }: { entries: FutureStockEntry[]; totalCount: number; stats: FutureStats }) {
  if (entries.length === 0) return null;
  const countLabel = entries.length === totalCount ? `${entries.length} previsões` : `${entries.length} de ${totalCount} previsões`;
  return <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground"><span>{countLabel}</span><span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-success" />Total: <strong className="text-foreground tabular-nums">{stats.totalUnits.toLocaleString("pt-BR")} un.</strong>{stats.confirmedUnits > 0 && <span className="text-success ml-1">({Math.round((stats.confirmedUnits / stats.totalUnits) * 100)}% confirmado)</span>}</span></div>;
}

function compareEntries(left: FutureStockEntry, right: FutureStockEntry, field: SortField) {
  if (field === "date") return new Date(left.expectedDate).getTime() - new Date(right.expectedDate).getTime();
  if (field === "quantity") return left.expectedQuantity - right.expectedQuantity;
  if (field === "product") return (left.productName || "").localeCompare(right.productName || "");
  const order = { confirmed: 0, in_transit: 1, pending: 2, partial: 3 };
  return (order[left.status as keyof typeof order] ?? 4) - (order[right.status as keyof typeof order] ?? 4);
}

function filterFutureEntries({ entries, search, status, dateRange, sortField, sortDir }: { entries: FutureStockEntry[]; search: string; status: StatusFilter; dateRange: DateRange; sortField: SortField; sortDir: SortDir }) {
  const query = search.toLowerCase();
  const cutoff = dateRange === "all" ? null : new Date();
  if (cutoff) cutoff.setDate(cutoff.getDate() + parseInt(dateRange));
  return entries.filter((entry) => !query || [entry.productName, entry.productSku, entry.colorName, entry.supplierName].some((value) => value?.toLowerCase().includes(query)))
    .filter((entry) => status === "all" || entry.status === status)
    .filter((entry) => !cutoff || new Date(entry.expectedDate) <= cutoff)
    .sort((left, right) => (sortDir === "asc" ? 1 : -1) * compareEntries(left, right, sortField));
}

function futureStats(entries: FutureStockEntry[]): FutureStats {
  const unitsFor = (status: FutureStockEntry["status"]) => entries.filter((entry) => entry.status === status).reduce((sum, entry) => sum + entry.expectedQuantity, 0);
  const firstDate = entries[0]?.expectedDate;
  return {
    totalUnits: entries.reduce((sum, entry) => sum + entry.expectedQuantity, 0), confirmedUnits: unitsFor("confirmed"), inTransitUnits: unitsFor("in_transit"),
    uniqueProducts: new Set(entries.map((entry) => entry.productId)).size,
    nextDate: firstDate ? entries.reduce((minimum, entry) => entry.expectedDate < minimum ? entry.expectedDate : minimum, firstDate) : null,
    total: entries.length, overdueCount: entries.filter((entry) => daysUntil(entry.expectedDate) < 0).length,
  };
}

function useFutureDialog(entries: FutureStockEntry[]) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const filtered = useMemo(() => filterFutureEntries({ entries, search, status, dateRange, sortField, sortDir }), [entries, search, status, dateRange, sortField, sortDir]);
  const stats = useMemo(() => futureStats(filtered), [filtered]);
  const toggleSort = (field: SortField) => { if (sortField === field) setSortDir((direction) => direction === "asc" ? "desc" : "asc"); else { setSortField(field); setSortDir("asc"); } };
  const clear = () => { setSearch(""); setStatus("all"); setDateRange("all"); };
  const activeFilters = Number(status !== "all") + Number(dateRange !== "all") + Number(Boolean(search));
  return { search, setSearch, status, setStatus, dateRange, setDateRange, sortField, viewMode, setViewMode, filtered, stats, toggleSort, clear, activeFilters };
}

// ============================================
// MAIN DIALOG
// ============================================
export function FutureStockDialog({ open, onOpenChange, entries }: FutureStockDialogProps) {
  const state = useFutureDialog(entries);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="h-4 w-4 text-primary" />
            </div>
            Previsão de Reposição
            <Badge variant="secondary" className="ml-1 font-normal">
              {entries.length} previsões
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Planeje suas vendas com base nas reposições previstas — filtre por data, status ou produto.
          </DialogDescription>
        </DialogHeader>

        <FutureSummary stats={state.stats} />
        <ConfirmationProgress stats={state.stats} />
        <OverdueAlert count={state.stats.overdueCount} />
        <FutureFilters search={state.search} status={state.status} dateRange={state.dateRange} viewMode={state.viewMode} activeCount={state.activeFilters} setSearch={state.setSearch} setStatus={state.setStatus} setDateRange={state.setDateRange} setViewMode={state.setViewMode} onClear={state.clear} />
        <FutureEntries entries={state.filtered} activeFilters={state.activeFilters} viewMode={state.viewMode} sortField={state.sortField} onSort={state.toggleSort} onClear={state.clear} />
        <FutureFooter entries={state.filtered} totalCount={entries.length} stats={state.stats} />
      </DialogContent>
    </Dialog>
  );
}
