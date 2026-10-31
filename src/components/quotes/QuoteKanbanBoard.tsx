import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuotes } from "@/hooks/quotes/useQuotes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QUOTE_STATUS_CONFIG } from "@/lib/quote-status-config";
import { formatCurrency } from "@/utils/quote-calculations";
import { 
  Clock, 
  ArrowRight, 
  Building2, 
  GripVertical, 
  AlertTriangle, 
  Lock,
  PackageX,
  TrendingUp,
  TrendingDown,
  Info,
  Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { type Quote } from "@/hooks/quotes/quoteTypes";
import { useRBAC } from "@/hooks/useRBAC";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuotesStockStatus } from "@/hooks/quote/useQuotesStockStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const KANBAN_STATUSES = ["draft", "pending", "sent", "approved", "rejected"] as const;
type KanbanStatus = (typeof KANBAN_STATUSES)[number];
type SortableAttributes = ReturnType<typeof useSortable>["attributes"];
type SortableListeners = ReturnType<typeof useSortable>["listeners"];
type QuoteWithId = Quote & { id: string };

function hasQuoteId(quote: Quote): quote is QuoteWithId {
  return typeof quote.id === "string" && quote.id.length > 0;
}

function isKanbanStatus(value: string): value is KanbanStatus {
  return (KANBAN_STATUSES as readonly string[]).includes(value);
}

function resolveDropStatus(overId: string, quotes: Quote[]): KanbanStatus | null {
  if (isKanbanStatus(overId)) return overId;
  const quote = quotes.find((item) => item.id === overId);
  return quote && isKanbanStatus(quote.status) ? quote.status : null;
}

function getMarginColor(margin: number): string {
  if (margin >= 30) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  if (margin >= 15) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  return "text-destructive bg-destructive/10 border-destructive/20";
}

function quoteCardMetrics(quote: Quote) {
  const totalCost = quote.total_cost || 0;
  const totalValue = quote.total || 0;
  const isStale = quote.updated_at ? Date.now() - new Date(quote.updated_at).getTime() > 7 * 24 * 60 * 60 * 1000 : false;
  return {
    totalCost,
    totalValue,
    isHighValue: totalValue > 5000,
    isPendingResponse: quote.status === "sent" && isStale,
    margin: totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0,
  };
}

function quoteCardClassName(flags: {
  isOverlay?: boolean;
  isHighValue: boolean;
  isPendingResponse: boolean;
  disabled?: boolean;
  isSelected?: boolean;
}): string {
  return cn(
    "group cursor-pointer hover:shadow-md transition-all duration-200 border-border/60 bg-card select-none relative",
    flags.isOverlay && "shadow-xl border-primary ring-2 ring-primary/20",
    flags.isHighValue && "border-l-4 border-l-amber-500",
    flags.isPendingResponse && "border-l-4 border-l-destructive",
    flags.disabled && "opacity-80 grayscale-[0.3]",
    flags.isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
  );
}

interface QuoteKanbanBoardProps {
  quotes: Quote[];
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
}

function KanbanColumns({ columns, navigate, setQuickView, supervisor, selectedIds, onToggleSelection, stockIssues }: {
  columns: Record<string, Quote[]>; navigate: (path: string) => void; setQuickView: (quote: Quote) => void;
  supervisor: boolean; selectedIds: string[]; onToggleSelection: (id: string) => void; stockIssues: Record<string, boolean>;
}) {
  return <div className="flex gap-6 h-[calc(100vh-320px)] min-h-[500px] overflow-x-auto pb-4">
    {KANBAN_STATUSES.map((status) => <KanbanColumn key={status} status={status} quotes={columns[status] ?? []}
      onQuoteClick={(id) => navigate(`/orcamentos/${id}`)} onQuickView={setQuickView}
      isReadOnly={['approved', 'rejected'].includes(status) && !supervisor} selectedIds={selectedIds}
      onToggleSelection={onToggleSelection} stockIssues={stockIssues} />)}
  </div>;
}

function KanbanOverlay({ activeId, quote }: { activeId: string | null; quote: Quote | null }) {
  return <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
    {activeId && quote ? <QuoteCard quote={quote} isOverlay /> : null}
  </DragOverlay>;
}

function QuickViewItems({ quote }: { quote: Quote | null }) {
  return <div className="space-y-4"><h4 className="text-sm font-semibold flex items-center gap-2"><Info className="h-4 w-4" /> Resumo dos Itens</h4>
    <div className="space-y-3">{quote?.items?.map((item, index) => <div key={index} className="flex gap-3 text-sm p-3 rounded-lg border bg-muted/30">
      <div className="h-10 w-10 rounded bg-background border flex items-center justify-center shrink-0">{item.product_image_url
        ? <img src={item.product_image_url} alt={item.product_name} className="h-full w-full object-contain" /> : <PackageX className="h-5 w-5 text-muted-foreground" />}</div>
      <div className="flex-1 min-w-0"><p className="font-medium truncate">{item.product_name}</p><div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{item.quantity} un.</span><span>{formatCurrency(item.unit_price)} / un.</span></div></div></div>)}</div></div>;
}

function quickViewFinancials(quote: Quote | null) {
  if (!quote) return { subtotal: 0, discount: 0, discountPercent: 0, total: 0 };
  return { subtotal: quote.subtotal || 0, discount: quote.discount_amount || 0,
    discountPercent: quote.discount_percent || 0, total: quote.total || 0 };
}

function QuickViewTotals({ quote }: { quote: Quote | null }) {
  const financials = quickViewFinancials(quote);
  return <div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span>
    <span>{formatCurrency(financials.subtotal)}</span></div>
    {financials.discount > 0 && <div className="flex justify-between text-sm text-destructive">
      <span>Desconto ({financials.discountPercent}%)</span><span>-{formatCurrency(financials.discount)}</span></div>}
    <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total</span>
      <span className="text-primary">{formatCurrency(financials.total)}</span></div></div>;
}

function QuickView({ quote, close, navigate }: { quote: Quote | null; close: () => void; navigate: (path: string) => void }) {
  return <Sheet open={Boolean(quote)} onOpenChange={(open) => { if (!open) close(); }}><SheetContent className="sm:max-w-md overflow-y-auto">
    <SheetHeader className="mb-6"><div className="flex items-center justify-between"><SheetTitle className="text-xl font-bold">#{quote?.quote_number}</SheetTitle>
      <Badge variant="secondary">{quote && QUOTE_STATUS_CONFIG[quote.status]?.label}</Badge></div>
      <SheetDescription className="flex flex-col gap-1"><span className="font-medium text-foreground">{quote?.client_company || quote?.client_name || "Sem cliente"}</span>
        <span className="text-xs">Criado em: {quote?.created_at && new Date(quote.created_at).toLocaleDateString()}</span></SheetDescription>
    </SheetHeader><div className="space-y-6"><QuickViewItems quote={quote} /><Separator /><QuickViewTotals quote={quote} />
      <div className="flex gap-2 pt-4"><Button className="flex-1" onClick={() => quote?.id && navigate(`/orcamentos/${quote.id}`)}>Ver Detalhes Completos</Button></div>
    </div></SheetContent></Sheet>;
}

function useKanbanDrag(quotes: Quote[], updateQuoteStatus: ReturnType<typeof useQuotes>["updateQuoteStatus"]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveQuote(quotes.find((quote) => quote.id === event.active.id) ?? null);
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null); setActiveQuote(null);
    if (!event.over) return;
    const quoteId = event.active.id as string;
    const nextStatus = resolveDropStatus(event.over.id as string, quotes);
    const quote = quotes.find((candidate) => candidate.id === quoteId);
    if (!quote || !nextStatus || quote.status === nextStatus) return;
    if (nextStatus === "approved") return void toast.error("A aprovação final exige o PDF assinado no detalhe do orçamento.");
    await updateQuoteStatus(quoteId, nextStatus);
  };
  return { activeId, activeQuote, sensors, handleDragStart, handleDragEnd };
}

export function QuoteKanbanBoard({ 
  quotes: initialQuotes,
  selectedIds,
  onToggleSelection
}: QuoteKanbanBoardProps) {
  const { updateQuoteStatus, isLoading: quotesLoading } = useQuotes();
  const { isSupervisorOrAbove } = useRBAC();
  const navigate = useNavigate();

  const quoteIdsForStock = useMemo(() => initialQuotes.filter(hasQuoteId).map((quote) => quote.id), [initialQuotes]);
  const { data: stockIssues } = useQuotesStockStatus(quoteIdsForStock);
  
  const [quickViewQuote, setQuickViewQuote] = useState<Quote | null>(null);
  const drag = useKanbanDrag(initialQuotes, updateQuoteStatus);

  const columns = useMemo(() => {
    const map: Record<string, Quote[]> = {};
    KANBAN_STATUSES.forEach((s) => (map[s] = []));
    initialQuotes.forEach((q) => {
      if (isKanbanStatus(q.status)) {
        map[q.status]?.push(q);
      }
    });
    return map;
  }, [initialQuotes]);

  if (quotesLoading) return <div className="h-96 flex items-center justify-center">Carregando quadro...</div>;
  return <DndContext sensors={drag.sensors} collisionDetection={closestCorners} onDragStart={drag.handleDragStart} onDragEnd={drag.handleDragEnd}>
    <KanbanColumns columns={columns} navigate={navigate} setQuickView={setQuickViewQuote} supervisor={isSupervisorOrAbove}
      selectedIds={selectedIds} onToggleSelection={onToggleSelection} stockIssues={stockIssues || {}} />
    <KanbanOverlay activeId={drag.activeId} quote={drag.activeQuote} />
    <QuickView quote={quickViewQuote} close={() => setQuickViewQuote(null)} navigate={navigate} />
  </DndContext>;
}

interface KanbanColumnProps {
  status: KanbanStatus;
  quotes: Quote[];
  onQuoteClick: (id: string) => void;
  onQuickView: (quote: Quote) => void;
  isReadOnly?: boolean;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  stockIssues: Record<string, boolean>;
}

function KanbanColumnHeader({ status, quotes, readOnly }: { status: KanbanStatus; quotes: Quote[]; readOnly: boolean }) {
  const config = QUOTE_STATUS_CONFIG[status];
  return <div className="p-4 border-b border-border/40 bg-card/50"><div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0"><div className={cn("w-2 h-2 rounded-full", config?.badgeClassName)} />
      <h3 className="font-display font-bold text-sm truncate">{config?.label}</h3></div>
    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">{quotes.length}</Badge>
    {readOnly && <Lock className="h-3 w-3 text-muted-foreground" />}
  </div><p className="text-[10px] text-muted-foreground mt-1 flex justify-between items-center">
    <span>Total: {formatCurrency(quotes.reduce((sum, quote) => sum + (quote.total || 0), 0))}</span>
    <span className="opacity-70">{quotes.length} cards</span></p></div>;
}

function KanbanColumnBody({ quotes, quoteIds, props }: {
  quotes: QuoteWithId[]; quoteIds: string[]; props: KanbanColumnProps;
}) {
  return <ScrollArea className="flex-1 p-3"><SortableContext items={quoteIds} strategy={verticalListSortingStrategy}>
    <div className="space-y-3">{quotes.length === 0 ? <div className="py-10 text-center opacity-40">
      <Clock className="h-8 w-8 mx-auto mb-2" /><p className="text-[11px]">Arraste aqui</p></div>
      : quotes.map((quote) => <SortableQuoteCard key={quote.id} quote={quote}
        onClick={() => props.onQuoteClick(quote.id)} onQuickView={() => props.onQuickView(quote)} disabled={props.isReadOnly}
        isSelected={props.selectedIds.includes(quote.id)} onToggleSelection={props.onToggleSelection}
        hasStockIssue={props.stockIssues[quote.id]} />)}</div>
  </SortableContext></ScrollArea>;
}

function KanbanColumn(input: KanbanColumnProps) {
  const { status, quotes, isReadOnly = false } = input;
  const props = { ...input, isReadOnly };
  const quotesWithIds = useMemo(() => quotes.filter(hasQuoteId), [quotes]);
  const quoteIds = useMemo(() => quotesWithIds.map((quote) => quote.id), [quotesWithIds]);

  const { setNodeRef, isOver } = useSortable({
    id: status,
    data: {
      type: "Column",
      status,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-[320px] shrink-0 bg-muted/20 rounded-2xl border transition-colors overflow-hidden",
        isOver ? "border-primary bg-primary/5" : "border-border/40"
      )}
    >
      <KanbanColumnHeader status={status} quotes={quotes} readOnly={isReadOnly} />

      <KanbanColumnBody quotes={quotesWithIds} quoteIds={quoteIds} props={props} />
    </div>
  );
}

interface QuoteCardProps {
  quote: Quote;
  isOverlay?: boolean;
  onClick?: () => void;
  onQuickView?: () => void;
  disabled?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  hasStockIssue?: boolean;
}

interface SortableQuoteCardProps {
  quote: QuoteWithId;
  onClick: () => void;
  onQuickView: () => void;
  disabled?: boolean;
  isSelected?: boolean;
  onToggleSelection: (id: string) => void;
  hasStockIssue?: boolean;
}

function SortableQuoteCard({ quote, onClick, onQuickView, disabled, isSelected,
  onToggleSelection, hasStockIssue }: SortableQuoteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: quote.id,
    disabled: disabled
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) return <div ref={setNodeRef} style={style}
    className="h-[120px] rounded-xl border-2 border-dashed border-primary/30 bg-primary/5" />;

  return (
    <div ref={setNodeRef} style={style}>
      <QuoteCard 
        quote={quote} 
        onClick={onClick} 
        onQuickView={onQuickView}
        attributes={attributes} 
        listeners={listeners} 
        disabled={disabled} 
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
        hasStockIssue={hasStockIssue}
      />
    </div>
  );
}

type ExtendedQuoteCardProps = QuoteCardProps & { attributes?: SortableAttributes; listeners?: SortableListeners };

function CardSelection({ quote, selected, toggle, overlay }: {
  quote: Quote; selected?: boolean; toggle?: (id: string) => void; overlay?: boolean;
}) {
  if (!toggle || overlay || !quote.id) return null;
  return <div className="absolute top-2 left-2 z-20" onClick={(event) => { event.stopPropagation(); toggle(quote.id as string); }}>
    <Checkbox checked={selected} className="rounded-sm h-4 w-4 data-[state=checked]:bg-primary border-muted-foreground/30" />
  </div>;
}

function CardHeader({ props, metrics, supervisor }: {
  props: ExtendedQuoteCardProps; metrics: ReturnType<typeof quoteCardMetrics>; supervisor: boolean;
}) {
  const { quote, attributes, listeners, disabled, hasStockIssue } = props;
  return <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1">
    <div className="flex items-center gap-2 flex-wrap"><p className="text-xs font-bold text-foreground truncate">#{quote.quote_number}</p>
      {metrics.isHighValue && <Badge variant="outline" className="h-4 px-1 text-[8px] bg-amber-500/10 text-amber-600 border-amber-500/20">Alta Alçada</Badge>}
      {metrics.isPendingResponse && <Badge variant="outline" className="h-4 px-1 text-[8px] bg-destructive/10 text-destructive border-destructive/20 animate-pulse">
        <Clock className="h-2 w-2 mr-1" />Follow-up Pendente</Badge>}
      {supervisor && <TooltipProvider><Tooltip><TooltipTrigger asChild><Badge variant="outline" className={cn("h-4 px-1 text-[8px] border", getMarginColor(metrics.margin))}>
        {metrics.margin > 0 ? <TrendingUp className="h-2 w-2 mr-0.5" /> : <TrendingDown className="h-2 w-2 mr-0.5" />}{metrics.margin.toFixed(1)}%
      </Badge></TooltipTrigger><TooltipContent side="top" className="text-[10px] p-2"><p className="font-bold">Rentabilidade Estimada</p>
        <p>Valor: {formatCurrency(metrics.totalValue)}</p><p>Custo: {formatCurrency(metrics.totalCost)}</p>
        <p>Lucro: {formatCurrency(metrics.totalValue - metrics.totalCost)}</p></TooltipContent></Tooltip></TooltipProvider>}
      {hasStockIssue && <Badge variant="destructive" className="h-4 px-1 text-[8px] animate-pulse"><PackageX className="h-2 w-2 mr-1" />Estoque Crítico</Badge>}
    </div><div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1"><Building2 className="h-3 w-3 shrink-0" />
      <span className="truncate">{quote.client_company || quote.client_name || "Sem cliente"}</span></div>
  </div>{!disabled ? <div {...attributes} {...listeners} className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing">
    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" /></div> : <div className="p-1 opacity-40"><Lock className="h-3.5 w-3.5 text-muted-foreground" /></div>}
  </div>;
}

function CardFooter({ quote, quickView }: { quote: Quote; quickView?: () => void }) {
  return <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
    <Badge variant="secondary" className="text-[10px] h-5 tabular-nums font-bold text-primary">{formatCurrency(quote.total || 0)}</Badge>
    <div className="flex items-center gap-2 min-w-0">{quickView && <Button variant="ghost" size="icon"
      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(event) => { event.stopPropagation(); quickView(); }}>
      <Eye className="h-3 w-3" /></Button>}<span className="text-[9px] text-muted-foreground truncate">
      {quote.updated_at ? new Date(quote.updated_at).toLocaleDateString() : "Recente"}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div></div>;
}

function QuoteCard(props: ExtendedQuoteCardProps) {
  const { quote, isOverlay, onClick, onQuickView, disabled, isSelected, onToggleSelection } = props;
  const { isSupervisorOrAbove } = useRBAC();
  const metrics = quoteCardMetrics(quote);
  return <Card className={quoteCardClassName({ isOverlay, isHighValue: metrics.isHighValue,
    isPendingResponse: metrics.isPendingResponse, disabled, isSelected })} onClick={onClick}>
    <CardSelection quote={quote} selected={isSelected} toggle={onToggleSelection} overlay={isOverlay} />
    <CardContent className={cn("p-3 space-y-3", onToggleSelection && "pl-8")}>
      <CardHeader props={props} metrics={metrics} supervisor={isSupervisorOrAbove} />
      <CardFooter quote={quote} quickView={onQuickView} />
      {quote.status === "pending_approval" && <div className="flex items-center gap-1.5 text-[9px] text-amber-600 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
        <AlertTriangle className="h-3 w-3" /><span>Aguardando autorização de desconto</span></div>}
    </CardContent>
  </Card>;
}
