import React, { useMemo, useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import type { Quote } from "@/hooks/quotes/quoteTypes";
import { Package, Hash, Layers, PieChart, FileText, Search, ChevronDown, ChevronRight, ArrowUpDown, Download, History, Share2, Save, X, Calendar, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { consolidateQuoteItems, toSafeCsvCell, type ConsolidatedQuoteItem, type ConsolidationSortConfig, type ConsolidationSortKey } from "./quoteConsolidationHelpers";

interface SavedView {
  id: string;
  name: string;
  searchTerm: string;
  sortConfig: ConsolidationSortConfig;
}

interface QuoteHistoryEntry {
  id: string;
  quote_id: string;
  action: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user_id: string | null;
  actor_name?: string | null;
}

interface QuoteConsolidationPanelProps {
  quotes: Quote[];
  title?: string;
  description?: string;
}

function ConsolidatedSource({ source }: { source: ConsolidatedQuoteItem["sources"][number] }) {
  return <div className="flex items-center justify-between text-xs p-2 rounded bg-background border border-border/40">
    <div className="flex flex-col gap-0.5"><span className="font-semibold text-primary">#{source.number}</span>
      <span className="text-[10px] text-muted-foreground">{source.client}</span></div>
    <div className="flex gap-6 text-[11px]"><span>Qtd: <strong>{source.quantity}</strong></span>
      <span>Preço médio: <strong>{formatCurrency(source.quantity ? source.total_value / source.quantity : 0)}</strong></span>
      <span>Total: <strong>{formatCurrency(source.total_value)}</strong></span></div>
  </div>;
}

function ConsolidatedRow({ item, expanded, toggle }: { item: ConsolidatedQuoteItem; expanded: boolean; toggle: () => void }) {
  return <React.Fragment><TableRow className="hover:bg-muted/30 cursor-pointer" onClick={toggle}>
    <TableCell>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
    <TableCell><div className="flex flex-col"><span className="font-medium text-sm">{item.product_name}</span>
      {item.product_sku && <span className="text-[10px] font-mono text-muted-foreground">SKU: {item.product_sku}</span>}
    </div></TableCell><TableCell className="text-center font-semibold">{item.total_quantity}</TableCell>
    <TableCell className="text-center text-sm">{formatCurrency(item.average_price)}</TableCell>
    <TableCell className="text-center font-bold text-primary">{formatCurrency(item.total_value)}</TableCell>
    <TableCell className="text-right"><Badge variant="secondary" className="text-[9px] h-4 px-1">{item.sources.length} orçamentos</Badge></TableCell>
  </TableRow>{expanded && <TableRow className="bg-muted/10 border-l-2 border-l-primary/50"><TableCell colSpan={6} className="p-0">
    <div className="p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-2">Detalhamento por Origem</h4>
      <div className="grid grid-cols-1 gap-2">{item.sources.map((source) => <ConsolidatedSource key={source.key} source={source} />)}</div>
    </div></TableCell></TableRow>}</React.Fragment>;
}

function HistoryEntryRow({ entry }: { entry: QuoteHistoryEntry }) {
  const actor = entry.actor_name || (entry.user_id ? "Usuário sem nome disponível" : "Sistema");
  return <div className="relative flex items-center justify-between p-4 group transition-all duration-300"><div className="flex items-center w-full">
    <div className="absolute left-5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background bg-primary z-10 shadow-[0_0_8px_rgba(var(--primary),0.4)] group-hover:scale-125 transition-transform" />
    <div className="ml-10 space-y-1 flex-1"><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
      <Calendar className="h-3 w-3" />{format(new Date(entry.created_at), "dd/MM/yyyy", { locale: ptBR })}
      <Clock className="h-3 w-3 ml-1" />{format(new Date(entry.created_at), "HH:mm")}</span>
      <Badge variant="outline" className="text-[9px] h-4 font-mono uppercase tracking-widest">{entry.action}</Badge></div>
      <p className="text-sm font-medium leading-relaxed">{entry.description || entry.action}</p>
      {(entry.old_value || entry.new_value) && <div className="flex items-center gap-3 text-xs pt-1">
        {entry.old_value && <span className="text-muted-foreground line-through decoration-destructive/50">{entry.old_value}</span>}
        <span className="text-muted-foreground">→</span>{entry.new_value && <span className="font-bold text-primary">{entry.new_value}</span>}
      </div>}
    </div><div className="text-right"><span className="text-[10px] font-medium text-muted-foreground block uppercase">Alterado por</span>
      <span className="text-xs font-semibold">{actor}</span></div>
  </div></div>;
}

function HistoryBody({ loading, error, entries, retry }: {
  loading: boolean; error: boolean; entries: QuoteHistoryEntry[]; retry: () => void;
}) {
  if (loading) return <div className="space-y-3" aria-label="Carregando eventos registrados">
    {[0, 1, 2].map((index) => <Skeleton key={index} className="h-20" />)}</div>;
  if (error) return <div className="py-12 text-center text-muted-foreground"><p>Não foi possível carregar os eventos registrados.</p>
    <Button variant="outline" size="sm" className="mt-3" onClick={retry}>Tentar novamente</Button></div>;
  if (entries.length === 0) return <div className="py-12 text-center text-muted-foreground italic">
    Nenhum evento registrado para os filtros atuais.</div>;
  return <div className="relative space-y-0 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
    {entries.map((entry) => <HistoryEntryRow key={entry.id} entry={entry} />)}
  </div>;
}

function ConsolidatedItemsTable({ items, expanded, toggle, sort }: {
  items: ConsolidatedQuoteItem[]; expanded: string[]; toggle: (key: string) => void; sort: (key: ConsolidationSortKey) => void;
}) {
  const heading = (label: string, key: ConsolidationSortKey, centered = false) => <TableHead
    className={cn("cursor-pointer hover:text-primary transition-colors", centered && "text-center")} onClick={() => sort(key)}>
    <div className={cn("flex items-center gap-2", centered && "justify-center")}>{label}<ArrowUpDown className="h-3 w-3" /></div></TableHead>;
  return <div className="rounded-md border"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead className="w-10" />
    {heading("Produto / SKU", "product_name")}{heading("Qtd Total", "total_quantity", true)}
    {heading("Preço Médio", "average_price", true)}{heading("Total", "total_value", true)}
    <TableHead className="text-right">Origens</TableHead></TableRow></TableHeader><TableBody>
    {items.map((item) => <ConsolidatedRow key={item.key} item={item} expanded={expanded.includes(item.key)} toggle={() => toggle(item.key)} />)}
  </TableBody></Table></div>;
}

function SavedViewsDropdown({ views, load, remove, save }: {
  views: SavedView[]; load: (view: SavedView) => void; remove: (id: string, event: React.MouseEvent) => void; save: () => void;
}) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2 h-9">
    <Save className="h-4 w-4" />Visões Salvas</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56">
    <DropdownMenuLabel>Minhas Visões</DropdownMenuLabel><DropdownMenuSeparator />
    {views.length === 0 ? <DropdownMenuItem disabled className="text-xs italic">Nenhuma visão salva</DropdownMenuItem>
      : views.map((view) => <DropdownMenuItem key={view.id} onClick={() => load(view)} className="flex items-center justify-between">
        <span className="truncate">{view.name}</span><Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive"
          onClick={(event) => remove(view.id, event)}><X className="h-3 w-3" /></Button></DropdownMenuItem>)}
    <DropdownMenuSeparator /><DropdownMenuItem onClick={save} className="text-primary font-medium">
      <Save className="h-3.5 w-3.5 mr-2" />Salvar Atual como...</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}

function initialSort(): ConsolidationSortConfig {
  const encoded = new URLSearchParams(window.location.search).get("q_sort");
  if (encoded) try { return JSON.parse(atob(encoded)) as ConsolidationSortConfig; } catch (error) { console.error(error); }
  const saved = localStorage.getItem("quote_consolidation_sort");
  return saved ? JSON.parse(saved) as ConsolidationSortConfig : { key: "total_value", direction: "desc" };
}

function useConsolidationFilters() {
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q_search")
    || localStorage.getItem("quote_consolidation_search") || "");
  const [sort, setSort] = useState<ConsolidationSortConfig>(initialSort);
  useEffect(() => localStorage.setItem("quote_consolidation_search", search), [search]);
  useEffect(() => localStorage.setItem("quote_consolidation_sort", JSON.stringify(sort)), [sort]);
  const reset = () => { setSearch(""); setSort({ key: "total_value", direction: "desc" }); toast.info("Filtros redefinidos"); };
  const toggleSort = (key: ConsolidationSortKey) => setSort((previous) => ({
    key, direction: previous?.key === key && previous.direction === "asc" ? "desc" : "asc",
  }));
  const share = () => {
    const params = new URLSearchParams(window.location.search); params.set("q_search", search);
    if (sort) params.set("q_sort", btoa(JSON.stringify(sort)));
    void navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?${params}`);
    toast.success("Link de compartilhamento copiado!", { description: "Os filtros e ordenação atuais foram codificados na URL." });
  };
  return { search, setSearch, sort, setSort, reset, toggleSort, share };
}

function useSavedViews(filters: ReturnType<typeof useConsolidationFilters>) {
  const [views, setViews] = useState<SavedView[]>(() => {
    const saved = localStorage.getItem("quote_consolidation_views"); return saved ? JSON.parse(saved) as SavedView[] : [];
  });
  const persist = (next: SavedView[]) => { setViews(next); localStorage.setItem("quote_consolidation_views", JSON.stringify(next)); };
  const save = () => {
    const name = prompt("Nome para esta visão:"); if (!name) return;
    persist([...views, { id: crypto.randomUUID(), name, searchTerm: filters.search, sortConfig: filters.sort }]); toast.success("Visão salva!");
  };
  const load = (view: SavedView) => { filters.setSearch(view.searchTerm); filters.setSort(view.sortConfig); toast.info(`Visão "${view.name}" carregada`); };
  const remove = (id: string, event: React.MouseEvent) => { event.stopPropagation(); persist(views.filter((view) => view.id !== id)); toast.success("Visão removida"); };
  return { views, save, load, remove };
}

async function fetchQuoteHistory(quoteIds: string[]): Promise<QuoteHistoryEntry[]> {
  const { data: history, error } = await supabase.from("quote_history")
    .select("id, quote_id, action, description, old_value, new_value, created_at, user_id")
    .in("quote_id", quoteIds).order("created_at", { ascending: false });
  if (error) throw error;
  const userIds = [...new Set((history ?? []).flatMap((entry) => entry.user_id ? [entry.user_id] : []))];
  if (!userIds.length) return (history ?? []) as QuoteHistoryEntry[];
  const { data: profiles, error: profileError } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
  if (profileError) throw profileError;
  const names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.full_name]));
  return (history ?? []).map((entry) => ({ ...entry, actor_name: entry.user_id ? names.get(entry.user_id) ?? null : null })) as QuoteHistoryEntry[];
}

function useConsolidationHistory(quotes: Quote[], enabled: boolean) {
  const [filter, setFilter] = useState<{ action?: string; search?: string }>({});
  const ids = useMemo(() => quotes.flatMap((quote) => quote.id ? [quote.id] : []), [quotes]);
  const query = useQuery({ queryKey: ["quote-consolidation-history", ids], enabled: enabled && ids.length > 0,
    queryFn: () => fetchQuoteHistory(ids) });
  const actions = useMemo(() => [...new Set((query.data ?? []).map((entry) => entry.action))], [query.data]);
  const entries = useMemo(() => { const search = filter.search?.trim().toLowerCase(); return (query.data ?? []).filter((entry) => {
    const actionMatches = !filter.action || entry.action === filter.action;
    const textMatches = !search || [entry.action, entry.description, entry.old_value, entry.new_value]
      .some((value) => value?.toLowerCase().includes(search));
    return actionMatches && textMatches;
  }); }, [query.data, filter]);
  return { filter, setFilter, query, actions, entries };
}

type ConsolidatedData = { items: ConsolidatedQuoteItem[]; totalGlobal: number; totalItems: number; quotesCount: number };
function useConsolidatedData(quotes: Quote[], search: string, sort: ConsolidationSortConfig): ConsolidatedData | null {
  return useMemo(() => {
    if (!quotes.length) return null;
    const items = consolidateQuoteItems(quotes, search, sort);
    return { items, totalGlobal: items.reduce((sum, item) => sum + item.total_value, 0),
      totalItems: items.reduce((sum, item) => sum + item.total_quantity, 0), quotesCount: quotes.length };
  }, [quotes, search, sort]);
}

function exportConsolidation(data: ConsolidatedData) {
  const headers = ["Produto", "SKU", "Qtd Total", "Preço Médio", "Total", "Nº Orçamentos"];
  const rows = data.items.map((item) => [item.product_name, item.product_sku || "", item.total_quantity,
    item.average_price.toFixed(2), item.total_value.toFixed(2), item.sources.length]);
  const content = [headers, ...rows].map((row) => row.map(toSafeCsvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a"); link.href = url;
  link.download = `consolidacao_compras_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
  toast.success("Exportação concluída!");
}

function ItemsTab({ title, description, data, expanded, toggle, filters, saved }: {
  title: string; description: string; data: ConsolidatedData; expanded: string[]; toggle: (key: string) => void;
  filters: ReturnType<typeof useConsolidationFilters>; saved: ReturnType<typeof useSavedViews>;
}) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0"><div>
    <CardTitle className="text-lg">{title}</CardTitle><CardDescription>{description}</CardDescription></div>
    <div className="flex items-center gap-3"><Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground hover:text-foreground"
      onClick={filters.reset} title="Redefinir filtros"><RefreshCw className="h-4 w-4" /></Button>
      <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filtrar por Produto ou SKU..." value={filters.search}
          onChange={(event) => filters.setSearch(event.target.value)} className="pl-9 h-9" /></div>
      <SavedViewsDropdown views={saved.views} load={saved.load} remove={saved.remove} save={saved.save} />
      <Button variant="outline" size="sm" className="gap-2 h-9" onClick={filters.share}><Share2 className="h-4 w-4" />Compartilhar</Button>
      <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => exportConsolidation(data)}><Download className="h-4 w-4" />Exportar CSV</Button>
    </div></CardHeader><CardContent><ConsolidatedItemsTable items={data.items} expanded={expanded} toggle={toggle} sort={filters.toggleSort} /></CardContent>
  </Card>;
}

function HistoryTab({ history }: { history: ReturnType<typeof useConsolidationHistory> }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0"><div>
    <CardTitle className="text-lg font-bold">Eventos registrados</CardTitle><CardDescription>Eventos persistidos nos orçamentos selecionados.</CardDescription></div>
    <div className="flex items-center gap-3"><div className="relative w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input placeholder="Buscar no histórico..." value={history.filter.search || ""}
        onChange={(event) => history.setFilter((previous) => ({ ...previous, search: event.target.value }))} className="pl-8 h-8 text-xs font-mono" /></div>
      <Select value={history.filter.action || "all"} onValueChange={(value) => history.setFilter((previous) => ({ ...previous, action: value === "all" ? undefined : value }))}>
        <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Ação" /></SelectTrigger><SelectContent>
          <SelectItem value="all">Todas as ações</SelectItem>{history.actions.map((action) => <SelectItem key={action} value={action}>{action}</SelectItem>)}
        </SelectContent></Select></div></CardHeader><CardContent><HistoryBody loading={history.query.isLoading} error={history.query.isError}
      entries={history.entries} retry={() => { void history.query.refetch(); }} /></CardContent>
  </Card>;
}

function MetricCard({ label, value, icon, primary = false }: {
  label: string; value: string; icon: typeof PieChart; primary?: boolean;
}) {
  const MetricIcon = icon;
  return <Card className={primary ? "bg-primary/5 border-primary/20" : ""}><CardHeader className="pb-2"><CardTitle
    className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
    <MetricIcon className={cn("h-3.5 w-3.5", primary && "text-primary")} />{label}
  </CardTitle></CardHeader><CardContent><div className={cn("text-2xl font-bold", primary && "text-primary")}>{value}</div></CardContent></Card>;
}

function ConsolidationMetrics({ data }: { data: ConsolidatedData }) {
  const metrics = [{ label: "Total Consolidado", value: formatCurrency(data.totalGlobal), icon: PieChart, primary: true },
    { label: "Total de Itens", value: data.totalItems.toLocaleString(), icon: Layers },
    { label: "Orçamentos", value: String(data.quotesCount), icon: FileText },
    { label: "SKUs Únicos", value: String(data.items.length), icon: Hash }];
  return <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>;
}

export function QuoteConsolidationPanel({ quotes, title = "Consolidação de Orçamentos",
  description = "Visão unificada de múltiplos orçamentos para análise de compra." }: QuoteConsolidationPanelProps) {
  const filters = useConsolidationFilters();
  const saved = useSavedViews(filters);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"items" | "history">("items");
  const history = useConsolidationHistory(quotes, activeTab === "history");
  const data = useConsolidatedData(quotes, filters.search, filters.sort);
  const toggle = (key: string) => setExpanded((previous) =>
    previous.includes(key) ? previous.filter((itemKey) => itemKey !== key) : [...previous, key]);
  if (!data) return <Card className="border-dashed"><CardContent className="py-10 text-center text-muted-foreground">
    <Package className="h-10 w-10 mx-auto mb-3 opacity-20" /><p>Nenhum orçamento selecionado para consolidação.</p>
  </CardContent></Card>;
  return <div className="space-y-6"><ConsolidationMetrics data={data} />
    <div className="flex items-center gap-2 mb-2 p-1 bg-muted/30 w-fit rounded-lg border border-border/40">
      <Button variant={activeTab === "items" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("items")} className="h-8 gap-2">
        <Layers className="h-4 w-4" /> Itens Consolidados</Button>
      <Button variant={activeTab === "history" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("history")} className="h-8 gap-2">
        <History className="h-4 w-4" /> Eventos registrados</Button>
    </div>
    {activeTab === "items" ? <ItemsTab title={title} description={description} data={data} expanded={expanded}
      toggle={toggle} filters={filters} saved={saved} /> : <HistoryTab history={history} />}
  </div>;
}
