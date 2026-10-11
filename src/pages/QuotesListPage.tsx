import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Plus, Search, BookTemplate, ArrowUpDown, AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown, DollarSign, Loader2, Download, FileSpreadsheet } from "lucide-react";
import { useQuotes } from "@/hooks/quotes/useQuotes";
import type { Quote } from "@/hooks/quotes/quoteTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/hooks/useRBAC";
import Fuse from "fuse.js";
import { format } from "date-fns";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuoteCardSkeleton } from "@/components/common/ContextualSkeleton";
import { FadeInView, AnimatedCounter } from "@/components/common/MicroInteractions";
import { QuotesConfigurableList } from "@/components/quotes/QuotesConfigurableList";
import { QuotesStatusChips } from "@/components/quotes/QuotesStatusChips";
import { QuotesFunnelChart } from "@/components/quotes/QuotesFunnelChart";
import { useQuoteFunnel } from "@/hooks/useQuoteFunnel";
import { useQuoteViewedMap } from "@/hooks/useQuoteViewedMap";
import { exportToExcel, exportToPDF } from "@/utils/orderExportUtils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "highest" | "lowest" | "expiring";
const DATE_FORMAT = "dd/MM/yyyy";
const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Mais recentes" }, { value: "oldest", label: "Mais antigos" },
  { value: "highest", label: "Maior valor" }, { value: "lowest", label: "Menor valor" },
  { value: "expiring", label: "Vencimento próximo" },
];

function sortFromParam(value: string | null): SortOption {
  return sortOptions.some((option) => option.value === value) ? (value as SortOption) : "newest";
}
function quoteDateTimestamp(value: string | null | undefined) { return value ? new Date(value).getTime() : 0; }
function quoteExpiryTimestamp(value: string | null | undefined) { return value ? new Date(value).getTime() : Infinity; }
function quoteTotal(quote: Quote) { return quote.total ?? 0; }
function hasQuoteId(quote: Quote): quote is Quote & { id: string } { return Boolean(quote.id); }
function formatCurrency(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }

const QUOTE_COMPARATORS: Record<SortOption, (left: Quote, right: Quote) => number> = {
  newest: (left, right) => quoteDateTimestamp(right.created_at) - quoteDateTimestamp(left.created_at),
  oldest: (left, right) => quoteDateTimestamp(left.created_at) - quoteDateTimestamp(right.created_at),
  highest: (left, right) => quoteTotal(right) - quoteTotal(left),
  lowest: (left, right) => quoteTotal(left) - quoteTotal(right),
  expiring: (left, right) => quoteExpiryTimestamp(left.valid_until) - quoteExpiryTimestamp(right.valid_until),
};

interface QuoteFilterOptions { searchTerm: string; statusFilter: string; quoteFuse: Fuse<Quote>; sortBy: SortOption }
function filterAndSortQuotes(quotes: Quote[], options: QuoteFilterOptions) {
  let results = options.searchTerm.length >= 2 ? options.quoteFuse.search(options.searchTerm).map((result) => result.item) : quotes;
  if (options.statusFilter !== "all") results = results.filter((quote) => quote.status === options.statusFilter);
  return [...results].sort(QUOTE_COMPARATORS[options.sortBy]);
}

function calculateKpis(quotes: Quote[]) {
  const approvedQuotes = quotes.filter((quote) => quote.status === "approved" || quote.status === "approved_singular");
  const total = quotes.length;
  const approved = approvedQuotes.length;
  return {
    total, approved,
    pending: quotes.filter((quote) => ["pending", "sent", "pending_singular_approval"].includes(quote.status)).length,
    pendingSingular: quotes.filter((quote) => quote.status === "pending_singular_approval").length,
    totalValue: quotes.reduce((sum, quote) => sum + quoteTotal(quote), 0),
    approvedValue: approvedQuotes.reduce((sum, quote) => sum + quoteTotal(quote), 0),
    conversionRate: total > 0 ? Math.round((approved / total) * 100) : 0,
  };
}

function buildExportRows(quotes: Quote[]) {
  return quotes.map((quote) => ({ ...quote, status_label: quote.status, total_formatted: quoteTotal(quote).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), valid_until_formatted: quote.valid_until ? format(new Date(quote.valid_until), DATE_FORMAT) : "-", created_at: quote.created_at || new Date(0).toISOString() }));
}

function useQuotesListState() {
  const navigate = useNavigate();
  const { isGestorCompras, isDev } = useAuth();
  const { isSupervisorOrAbove } = useRBAC();
  const quotesApi = useQuotes();
  // Filtros persistidos na URL: sobrevivem ao voltar da página de detalhe
  // e tornam uma visão filtrada compartilhável por link.
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "all");
  const [sortBy, setSortBy] = useState<SortOption>(() => sortFromParam(searchParams.get("ordem")));
  // URL -> estado: navegação que muda só a query da mesma rota (menu de
  // histórico, voltar do navegador) ressincroniza os filtros exibidos.
  // lastUrlRef/adoptingRef impedem a disputa: ao adotar uma URL externa, a
  // escrita é suspensa uma vez — senão ela devolveria a query antiga na
  // mesma renderização e desfaria a navegação.
  const lastUrlRef = useRef<string>(searchParams.toString());
  const adoptingRef = useRef(false);
  useEffect(() => {
    const url = searchParams.toString();
    if (url === lastUrlRef.current) return;
    lastUrlRef.current = url;
    adoptingRef.current = true;
    setSearchTerm((current) => (current === (searchParams.get("q") ?? "") ? current : (searchParams.get("q") ?? "")));
    setStatusFilter((current) => (current === (searchParams.get("status") ?? "all") ? current : (searchParams.get("status") ?? "all")));
    setSortBy((current) => (current === sortFromParam(searchParams.get("ordem")) ? current : sortFromParam(searchParams.get("ordem"))));
  }, [searchParams]);
  // estado -> URL
  useEffect(() => {
    if (adoptingRef.current) {
      adoptingRef.current = false;
      return;
    }
    const next = new URLSearchParams();
    if (searchTerm) next.set("q", searchTerm);
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (sortBy !== "newest") next.set("ordem", sortBy);
    const nextString = next.toString();
    if (nextString !== searchParams.toString()) {
      lastUrlRef.current = nextString;
      setSearchParams(next, { replace: true });
    }
  }, [searchTerm, statusFilter, sortBy, searchParams, setSearchParams]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const kpis = useMemo(() => calculateKpis(quotesApi.quotes), [quotesApi.quotes]);
  const allQuoteIds = useMemo(() => quotesApi.quotes.filter(hasQuoteId).map((quote) => quote.id), [quotesApi.quotes]);
  const allViewedMap = useQuoteViewedMap(allQuoteIds);
  const funnelData = useQuoteFunnel(quotesApi.quotes, allViewedMap);
  const quoteFuse = useMemo(() => new Fuse(quotesApi.quotes, { keys: [{ name: "quote_number", weight: 0.4 }, { name: "client_name", weight: 0.3 }, { name: "client_company", weight: 0.2 }, { name: "notes", weight: 0.1 }], threshold: 0.4, distance: 100, includeScore: true, minMatchCharLength: 2, ignoreLocation: true }), [quotesApi.quotes]);
  const filteredQuotes = useMemo(() => filterAndSortQuotes(quotesApi.quotes, { searchTerm, statusFilter, quoteFuse, sortBy }), [quotesApi.quotes, searchTerm, statusFilter, quoteFuse, sortBy]);
  const handleDelete = async () => { if (deleteConfirmId) await quotesApi.deleteQuote(deleteConfirmId); setDeleteConfirmId(null); };
  const handleBulkDelete = async () => { for (const id of bulkDeleteIds) await quotesApi.deleteQuote(id); setBulkDeleteIds([]); };
  const clearFilters = () => { setSearchTerm(""); setStatusFilter("all"); setSortBy("newest"); };
  return { navigate, isGestorCompras, isDev, isSupervisorOrAbove, ...quotesApi, searchTerm, setSearchTerm, statusFilter, setStatusFilter, sortBy, setSortBy, deleteConfirmId, setDeleteConfirmId, bulkDeleteIds, setBulkDeleteIds, kpis, funnelData, filteredQuotes, handleDelete, handleBulkDelete, clearFilters };
}

type QuotesState = ReturnType<typeof useQuotesListState>;

function QuotesLoading() {
  return <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in"><div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2"><FileText className="h-7 w-7" />Orçamentos</h1><p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Carregando orçamentos…</p></div></div><div className="grid gap-3">{[1, 2, 3, 4, 5].map((item) => <QuoteCardSkeleton key={item} />)}</div></div>;
}

function exportQuotes(quotes: Quote[], kind: "excel" | "pdf") {
  const rows = buildExportRows(quotes);
  if (kind === "excel") exportToExcel(rows, "orcamentos"); else exportToPDF(rows, "orcamentos");
}

function QuotesHeader({ state }: { state: QuotesState }) {
  return <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><FadeInView><div><h1 data-testid="page-title-orcamentos" className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2"><FileText className="h-7 w-7" />Orçamentos</h1><p className="text-muted-foreground mt-1"><AnimatedCounter value={state.filteredQuotes.length} /> orçamento(s) encontrado(s)</p></div></FadeInView><div className="flex gap-2"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="h-4 w-4 mr-2" />Exportar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => exportQuotes(state.filteredQuotes, "excel")}><FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)</DropdownMenuItem><DropdownMenuItem onClick={() => exportQuotes(state.filteredQuotes, "pdf")}><FileText className="h-4 w-4 mr-2" /> PDF (.pdf)</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Tooltip><TooltipTrigger asChild><Button variant="outline" onClick={() => state.navigate("/orcamentos/templates")}><BookTemplate className="h-4 w-4 mr-2" />Templates</Button></TooltipTrigger><TooltipContent><p>Modelos pré-configurados para agilizar orçamentos</p></TooltipContent></Tooltip><Button data-testid="quote-new-button" onClick={() => state.navigate("/orcamentos/novo")}><Plus className="h-4 w-4 mr-2" />Novo Orçamento</Button></div></div>;
}

function QuotesKpis({ state }: { state: QuotesState }) {
  const managerView = state.isGestorCompras || state.isDev;
  const hasPending = managerView && state.kpis.pendingSingular > 0;
  return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"><Card className="sm:col-span-2 md:col-span-1 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-glow-primary/10"><CardContent className="p-4 flex items-center gap-3"><div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 ring-1 ring-primary/30"><DollarSign className="h-5 w-5 text-primary" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">Total em Aberto</p><p className="text-lg font-display font-extrabold text-foreground truncate">{formatCurrency(state.kpis.totalValue)}</p></div></CardContent></Card><Card className="border-border/50"><CardContent className="p-3 flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-success/15 flex items-center justify-center shrink-0"><CheckCircle2 className="h-4 w-4 text-success" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">Aprovados</p><p className="text-sm font-bold text-foreground">{state.kpis.approved} <span className="text-xs font-normal text-muted-foreground">({formatCurrency(state.kpis.approvedValue)})</span></p></div></CardContent></Card><Card className={cn("border-border/50", hasPending && "border-emerald-500/50 bg-emerald-50/50")}><CardContent className="p-3 flex items-center gap-3"><div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", hasPending ? "bg-emerald-500/20" : "bg-warning/15")}><Clock className={cn("h-4 w-4", hasPending ? "text-emerald-600" : "text-warning")} /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">{managerView ? "Aguardando Vc" : "Pendentes"}</p><p className={cn("text-sm font-bold", hasPending ? "text-emerald-700" : "text-foreground")}>{managerView ? state.kpis.pendingSingular : state.kpis.pending}</p></div></CardContent></Card><Card className="border-border/50"><CardContent className="p-3 flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-info/15 flex items-center justify-center shrink-0"><TrendingUp className="h-4 w-4 text-info" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">Conversão</p><div className="flex items-center gap-1.5"><p className="text-sm font-bold text-foreground">{state.kpis.conversionRate}%</p>{state.kpis.conversionRate >= 20 ? <span className="text-[10px] font-semibold text-success flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> Bom</span> : <span className="text-[10px] font-semibold text-warning flex items-center gap-0.5"><TrendingDown className="h-3 w-3" /> Baixa</span>}</div></div></CardContent></Card></div>;
}

function QuotesFilters({ state }: { state: QuotesState }) {
  return <><div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar orçamento por número, cliente ou empresa" placeholder="Buscar por número, cliente ou empresa..." value={state.searchTerm} onChange={(event) => state.setSearchTerm(event.target.value)} className="pl-9" /></div><Select value={state.sortBy} onValueChange={(value) => state.setSortBy(value as SortOption)}><SelectTrigger className="w-[180px]"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue placeholder="Ordenar" /></SelectTrigger><SelectContent>{sortOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><QuotesStatusChips quotes={state.quotes} value={state.statusFilter} onChange={state.setStatusFilter} /></>;
}

async function updateBulkStatus(state: QuotesState, ids: string[], status: string) {
  if (status === "approved") { toast.error("A aprovação final exige o PDF assinado no detalhe de cada orçamento."); return; }
  let successCount = 0;
  for (const id of ids) if (await state.updateQuoteStatus(id, status as Quote["status"])) successCount++;
  toast.success(`${successCount} orçamento(s) atualizado(s)`);
}

function exportSelectedQuotes(state: QuotesState, ids: string[]) {
  const selected = state.filteredQuotes.filter(hasQuoteId).filter((quote) => ids.includes(quote.id));
  import("@/utils/excelExport").then(({ exportToExcel: exportRows }) => {
    exportRows({ filename: "orcamentos_selecionados", columns: [{ key: "Número", header: "Número" }, { key: "Empresa", header: "Empresa" }, { key: "Contato", header: "Contato" }, { key: "Status", header: "Status" }, { key: "Valor", header: "Valor" }, { key: "Data", header: "Data" }], data: selected.map((quote) => ({ Número: quote.quote_number, Empresa: quote.client_company || "", Contato: quote.client_name || "", Status: quote.status, Valor: quoteTotal(quote), Data: quote.created_at ? format(new Date(quote.created_at), DATE_FORMAT) : "" })) });
    toast.success(`${ids.length} orçamento(s) exportado(s)`);
  });
}

function QuotesResults({ state }: { state: QuotesState }) {
  const hasActiveFilters = Boolean(state.searchTerm) || state.statusFilter !== "all";
  if (state.filteredQuotes.length === 0) return <ScrollArea className="h-[calc(100vh-360px)] min-h-[400px]"><EmptyState variant="quotes" title={hasActiveFilters ? "Nenhum resultado para esses filtros" : "Nenhum orçamento encontrado"} description={hasActiveFilters ? "Ajuste a busca ou os chips de status, ou limpe todos os filtros." : "Crie seu primeiro orçamento e comece a vender."} action={hasActiveFilters ? { label: "Limpar filtros", onClick: state.clearFilters } : { label: "Criar Orçamento", onClick: () => state.navigate("/orcamentos/novo") }} /></ScrollArea>;
  return <ScrollArea className="h-[calc(100vh-360px)] min-h-[400px]"><QuotesConfigurableList quotes={state.filteredQuotes} isSupervisor={state.isSupervisorOrAbove} onDelete={state.setDeleteConfirmId} onBulkDelete={state.setBulkDeleteIds} onBulkStatusChange={(ids, status) => updateBulkStatus(state, ids, status)} onBulkExport={(ids) => exportSelectedQuotes(state, ids)} onDuplicate={state.reorderQuote} onMarkApproved={async (id) => { toast.info("Gere e assine o PDF no detalhe do orçamento para concluir a aprovação."); state.navigate(`/orcamentos/${id}`); }} /></ScrollArea>;
}

function QuotesDialogs({ state }: { state: QuotesState }) {
  return <><AlertDialog open={Boolean(state.deleteConfirmId)} onOpenChange={() => state.setDeleteConfirmId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={state.handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><AlertDialog open={state.bulkDeleteIds.length > 0} onOpenChange={() => state.setBulkDeleteIds([])}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir <strong>{state.bulkDeleteIds.length}</strong> orçamento(s)? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={state.handleBulkDelete} className="bg-destructive text-destructive-foreground">Excluir {state.bulkDeleteIds.length} orçamento(s)</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

function QuotesLoaded({ state }: { state: QuotesState }) {
  return <><PageSEO title="Orçamentos" description="Gerencie seus orçamentos. Crie, edite e acompanhe propostas comerciais." path="/orcamentos" /><TooltipProvider><div className="space-y-5"><QuotesHeader state={state} /><QuotesKpis state={state} />{state.quotes.length > 0 && <QuotesFunnelChart data={state.funnelData} />}{state.error && <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3"><AlertTriangle className="h-5 w-5 text-destructive shrink-0" /><div className="min-w-0"><p className="text-sm font-medium text-destructive">Módulo de orçamentos indisponível</p><p className="text-xs text-muted-foreground mt-0.5">{state.error}</p></div></div>}<QuotesFilters state={state} /><QuotesResults state={state} /></div><QuotesDialogs state={state} /></TooltipProvider></>;
}

export function QuotesListPage() {
  const state = useQuotesListState();
  if (state.isLoading) return <QuotesLoading />;
  return <QuotesLoaded state={state} />;
}

export default QuotesListPage;
