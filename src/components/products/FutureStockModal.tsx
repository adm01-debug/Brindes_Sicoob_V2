import { useState, useMemo } from "react";
import { format, parseISO, addDays, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Package, Truck, AlertTriangle, Calendar, Loader2, TrendingUp, ArrowUpDown, Filter, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useProductVariantsWithStock, processStockEntries, calculateColorSummary } from "@/hooks/useVariantSupplierSources";
import { sortColorSummary } from "@/utils/colorSorting";

type SortOrder = "nearest" | "farthest" | "quantity-desc" | "quantity-asc";
type DateFilter = "all" | "7days" | "30days" | "90days" | "past";
type StockEntry = ReturnType<typeof processStockEntries>[number];
type ColorSummary = ReturnType<typeof calculateColorSummary>[number];

interface FutureStockModalProps { open: boolean; onOpenChange: (open: boolean) => void; productId: string; productName: string; productSku: string }

function matchesDateFilter(entry: StockEntry, filter: DateFilter, now: Date) {
  if (filter === "all") return true;
  const date = parseISO(entry.expectedDate);
  if (filter === "past") return isBefore(date, now);
  const periods: Record<Exclude<DateFilter, "all" | "past">, number> = { "7days": 7, "30days": 30, "90days": 90 };
  return isAfter(date, now) && isBefore(date, addDays(now, periods[filter]));
}

function compareEntries(first: StockEntry, second: StockEntry, order: SortOrder) {
  if (order === "nearest") return new Date(first.expectedDate).getTime() - new Date(second.expectedDate).getTime();
  if (order === "farthest") return new Date(second.expectedDate).getTime() - new Date(first.expectedDate).getTime();
  if (order === "quantity-desc") return second.expectedQuantity - first.expectedQuantity;
  return first.expectedQuantity - second.expectedQuantity;
}

function filteredEntries(entries: StockEntry[], color: string | null, dateFilter: DateFilter, sortOrder: SortOrder) {
  const now = new Date();
  return entries.filter(entry => !color || entry.colorName === color)
    .filter(entry => matchesDateFilter(entry, dateFilter, now))
    .sort((first, second) => compareEntries(first, second, sortOrder));
}

function useFutureStockState(productId: string) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("nearest");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const query = useProductVariantsWithStock(productId);
  const variants = useMemo(() => query.data ?? [], [query.data]);
  const stockEntries = useMemo(() => processStockEntries(variants), [variants]);
  const colorSummary = useMemo(() => sortColorSummary(calculateColorSummary(variants, stockEntries)), [variants, stockEntries]);
  const entries = useMemo(() => filteredEntries(stockEntries, selectedColor, dateFilter, sortOrder), [stockEntries, selectedColor, dateFilter, sortOrder]);
  const clearFilters = () => { setSelectedColor(null); setDateFilter("all"); setSortOrder("nearest"); };
  return { selectedColor, setSelectedColor, sortOrder, setSortOrder, dateFilter, setDateFilter, variants, stockEntries, colorSummary, entries,
    isLoading: query.isLoading, error: query.error, clearFilters, hasActiveFilters: Boolean(selectedColor) || dateFilter !== "all" };
}

type FutureStockState = ReturnType<typeof useFutureStockState>;

function ModalHeader({ name, sku }: { name: string; sku: string }) {
  return <DialogHeader className="p-6 pb-4 border-b border-border"><DialogTitle className="flex items-center gap-3 text-xl">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center"><CalendarClock className="h-5 w-5 text-primary" /></div>
    <div><span>Estoque Futuro</span><p className="text-sm font-normal text-muted-foreground mt-0.5">{name} • SKU: {sku}</p></div>
  </DialogTitle></DialogHeader>;
}

function LoadingState() { return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>; }
function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  return <div className="flex flex-col items-center justify-center py-12 text-center"><div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4"><AlertTriangle className="h-8 w-8 text-destructive" /></div><h3 className="font-display font-medium text-foreground mb-1">Erro ao carregar dados</h3><p className="text-sm text-muted-foreground max-w-xs">{message}</p></div>;
}

function SortControl({ state }: { state: FutureStockState }) {
  return <div className="flex items-center gap-2"><ArrowUpDown className="h-4 w-4 text-muted-foreground" /><Select value={state.sortOrder} onValueChange={value => state.setSortOrder(value as SortOrder)}><SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Ordenar por" /></SelectTrigger><SelectContent>
    <SelectItem value="nearest"><span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Mais próximo</span></SelectItem>
    <SelectItem value="farthest"><span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Mais distante</span></SelectItem>
    <SelectItem value="quantity-desc"><span className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Maior qtd</span></SelectItem>
    <SelectItem value="quantity-asc"><span className="flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Menor qtd</span></SelectItem>
  </SelectContent></Select></div>;
}

function DateControl({ state }: { state: FutureStockState }) {
  return <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><Select value={state.dateFilter} onValueChange={value => state.setDateFilter(value as DateFilter)}><SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Período" /></SelectTrigger><SelectContent>
    <SelectItem value="all">Todas as datas</SelectItem><SelectItem value="7days">Próximos 7 dias</SelectItem><SelectItem value="30days">Próximos 30 dias</SelectItem><SelectItem value="90days">Próximos 90 dias</SelectItem><SelectItem value="past">Atrasados</SelectItem>
  </SelectContent></Select></div>;
}

function Filters({ state }: { state: FutureStockState }) {
  return <div className="flex flex-wrap items-center gap-3"><SortControl state={state} /><DateControl state={state} />
    {state.hasActiveFilters && <button onClick={state.clearFilters} className="text-xs text-primary hover:underline ml-auto">Limpar filtros</button>}
  </div>;
}

function compactQuantity(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value; }

function ColorButton({ color, selected, onSelect }: { color: ColorSummary; selected: boolean; onSelect: () => void }) {
  const hasEntries = color.incomingCount > 0;
  return <button onClick={onSelect} title={`${color.name}\nAtual: ${color.currentStock.toLocaleString("pt-BR")}\nPrevisto: +${color.incomingTotal.toLocaleString("pt-BR")}`}
    className={cn("relative rounded-lg overflow-hidden transition-all duration-200", "border bg-card hover:shadow-md hover:scale-105", selected && "ring-2 ring-primary ring-offset-1 ring-offset-background", !hasEntries && "opacity-40 grayscale")}
    style={{ borderColor: selected ? color.hex ?? undefined : undefined }}>
    <div className="aspect-square relative overflow-hidden">{color.thumbnail ? <img src={color.thumbnail} alt={color.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full" style={{ backgroundColor: color.hex || "#888" }} />}
      {hasEntries && <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 rounded bg-primary/90 text-primary-foreground text-[9px] font-bold">+{compactQuantity(color.incomingTotal)}</div>}
      <div className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-background/80 text-foreground text-[9px] font-medium">{compactQuantity(color.currentStock)}</div>
    </div><div className="p-1 text-center bg-card"><span className="text-[10px] font-medium truncate block leading-tight">{color.name}</span></div>
  </button>;
}

function ColorGrid({ state }: { state: FutureStockState }) {
  return <div className="space-y-2"><span className="text-sm font-medium text-muted-foreground">Filtrar por variação ({state.colorSummary.length} cores)</span>
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">{state.colorSummary.map(color => <ColorButton key={color.name} color={color} selected={state.selectedColor === color.name} onSelect={() => state.setSelectedColor(state.selectedColor === color.name ? null : color.name)} />)}</div>
  </div>;
}

function EmptyMessage({ kind }: { kind: "variants" | "future" }) {
  const variants = kind === "variants";
  return <div className="flex flex-col items-center justify-center py-12 text-center"><div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">{variants ? <Package className="h-8 w-8 text-muted-foreground" /> : <AlertTriangle className="h-8 w-8 text-muted-foreground" />}</div>
    <h3 className="font-display font-medium text-foreground mb-1">{variants ? "Produto sem variantes" : "Sem previsão de reposição"}</h3>
    <p className="text-sm text-muted-foreground max-w-xs">{variants ? "Este produto não possui variantes de cor cadastradas no sistema." : "Não há reposições agendadas para este produto no fornecedor."}</p>
    {!variants && <p className="text-xs text-muted-foreground/70 mt-2">Dica: Previsões são fornecidas apenas pela API SPOT (Stricker).</p>}
  </div>;
}

function entryStatus(days: number) { return { past: days < 0, urgent: days >= 0 && days <= 7 }; }
function statusBadge(past: boolean, urgent: boolean, index: number) {
  if (past) return { label: "Atrasado", className: "bg-destructive/10 text-destructive border-destructive/20" };
  if (urgent) return { label: "Em breve", className: "bg-warning/10 text-warning border-warning/20" };
  return { label: `Previsão ${index}`, className: "bg-info/10 text-info border-info/20" };
}
function daysLabel(days: number) {
  if (days < 0) return `${Math.abs(days)} dias atrás`;
  if (days === 0) return "hoje";
  return days === 1 ? "amanhã" : `${days} dias`;
}

function EntryCard({ entry }: { entry: StockEntry }) {
  const expectedDate = parseISO(entry.expectedDate);
  const days = Math.ceil((expectedDate.getTime() - Date.now()) / 86400000);
  const status = entryStatus(days);
  const badge = statusBadge(status.past, status.urgent, entry.entryIndex);
  const dateColor = status.past ? "text-destructive" : status.urgent ? "text-warning" : "text-foreground/70";
  return <div className={cn("flex items-center gap-4 p-4 rounded-xl border bg-card transition-all", status.urgent && !status.past && "border-warning/30 bg-warning/5", status.past && "border-destructive/30 bg-destructive/5")}>
    <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden border border-border">{entry.thumbnail ? <img src={entry.thumbnail} alt={entry.colorName} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full" style={{ backgroundColor: entry.colorHex ?? undefined }} />}</div>
    <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="font-medium text-foreground">{entry.colorName}</span><Badge variant="outline" className={cn("text-[10px] px-2 py-0", badge.className)}>{badge.label}</Badge></div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(expectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}<span className={cn("ml-1 font-medium", dateColor)}>({daysLabel(days)})</span></span><span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />SKU: {entry.supplierSku}</span></div>
      <div className="text-xs text-muted-foreground/70 mt-1">Estoque atual: {entry.currentStock.toLocaleString("pt-BR")} un{entry.reservedStock > 0 && <span className="ml-2">(reservado: {entry.reservedStock.toLocaleString("pt-BR")})</span>}</div>
    </div><div className="text-right shrink-0"><span className="text-xl font-bold text-primary">+{entry.expectedQuantity.toLocaleString("pt-BR")}</span><p className="text-xs text-muted-foreground">unidades</p></div>
  </div>;
}

function EntryList({ state }: { state: FutureStockState }) {
  return <div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm font-medium text-muted-foreground">Previsões de reposição ({state.entries.length})</span>
    {state.entries.length === 0 && state.hasActiveFilters && <span className="text-xs text-muted-foreground">Nenhum resultado para os filtros selecionados</span>}</div>
    <div className="space-y-3">{state.entries.map(entry => <EntryCard key={entry.id} entry={entry} />)}</div>
  </div>;
}

function StockSummary({ state }: { state: FutureStockState }) {
  if (state.stockEntries.length === 0 || state.entries.length === 0) return null;
  const total = state.entries.reduce((sum, entry) => sum + entry.expectedQuantity, 0);
  return <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center"><Truck className="h-5 w-5 text-primary" /></div><div><span className="font-medium text-foreground">{state.hasActiveFilters ? "Total filtrado" : "Total previsto"}</span><p className="text-sm text-muted-foreground">{state.entries.length} reposição(ões) agendada(s)</p></div></div>
    <div className="text-right"><span className="text-2xl font-bold text-primary">+{total.toLocaleString("pt-BR")}</span><p className="text-xs text-muted-foreground">unidades no total</p></div></div></div>;
}

function ModalBody({ state }: { state: FutureStockState }) {
  if (state.isLoading) return <LoadingState />;
  if (state.error) return <ErrorState error={state.error} />;
  const hasVariants = state.variants.length > 0;
  return <>{state.colorSummary.length > 0 && <div className="space-y-4"><Filters state={state} /><ColorGrid state={state} /></div>}
    {!hasVariants && <EmptyMessage kind="variants" />}
    {hasVariants && state.stockEntries.length === 0 ? <EmptyMessage kind="future" /> : hasVariants && <EntryList state={state} />}
    <StockSummary state={state} />
  </>;
}

export function FutureStockModal({ open, onOpenChange, productId, productName, productSku }: FutureStockModalProps) {
  const state = useFutureStockState(productId);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden"><ModalHeader name={productName} sku={productSku} />
    <ScrollArea className="flex-1 max-h-[calc(85vh-120px)]"><div className="p-6 space-y-6"><ModalBody state={state} /></div></ScrollArea>
  </DialogContent></Dialog>;
}
