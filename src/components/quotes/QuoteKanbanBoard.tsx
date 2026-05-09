import React, { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStart,
  DragOver,
  DragEnd,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuotes } from "@/hooks/useQuotes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Quote, QuoteItem } from "@/hooks/quotes/quoteTypes";
import { useRBAC } from "@/hooks/useRBAC";
import confetti from "canvas-confetti";
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

interface QuoteKanbanBoardProps {
  quotes: Quote[];
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
}

export function QuoteKanbanBoard({ 
  quotes: initialQuotes,
  selectedIds,
  onToggleSelection
}: QuoteKanbanBoardProps) {
  const { updateQuoteStatus, isLoading: quotesLoading, fetchQuotes } = useQuotes();
  const { isSupervisorOrAbove } = useRBAC();
  const navigate = useNavigate();

  const quoteIdsForStock = useMemo(() => initialQuotes.map(q => q.id!).filter(Boolean), [initialQuotes]);
  const { data: stockIssues } = useQuotesStockStatus(quoteIdsForStock);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [quickViewQuote, setQuickViewQuote] = useState<Quote | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns = useMemo(() => {
    const map: Record<string, Quote[]> = {};
    KANBAN_STATUSES.forEach((s) => (map[s] = []));
    initialQuotes.forEach((q) => {
      if (KANBAN_STATUSES.includes(q.status as any)) {
        map[q.status].push(q);
      }
    });
    return map;
  }, [initialQuotes]);

  const handleDragStart = (event: DragStart) => {
    const { active } = event;
    setActiveId(active.id as string);
    const quote = initialQuotes.find((q) => q.id === active.id);
    if (quote) setActiveQuote(quote);
  };

  const handleDragEnd = async (event: DragEnd) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveQuote(null);

    if (!over) return;

    const activeQuoteId = active.id as string;
    const overId = over.id as string;

    let newStatus: KanbanStatus | null = null;
    
    if (KANBAN_STATUSES.includes(overId as any)) {
      newStatus = overId as KanbanStatus;
    } else {
      const overQuote = initialQuotes.find((q) => q.id === overId);
      if (overQuote) {
        newStatus = overQuote.status as KanbanStatus;
      }
    }

    const currentQuote = initialQuotes.find((q) => q.id === activeQuoteId);
    if (currentQuote && newStatus && currentQuote.status !== newStatus) {
      const success = await updateQuoteStatus(activeQuoteId, newStatus as any);
      
      if (success && newStatus === 'approved') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00a859', '#fdd300', '#ffffff']
        });
      }
    }
  };

  if (quotesLoading) return <div className="h-96 flex items-center justify-center">Carregando quadro...</div>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 h-[calc(100vh-320px)] min-h-[500px] overflow-x-auto pb-4">
        {KANBAN_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            quotes={columns[status]}
            onQuoteClick={(id) => navigate(`/orcamentos/${id}`)}
            onQuickView={(quote) => setQuickViewQuote(quote)}
            isReadOnly={['approved', 'rejected'].includes(status) && !isSupervisorOrAbove}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
            stockIssues={stockIssues || {}}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: "0.5",
            },
          },
        }),
      }}>
        {activeId && activeQuote ? (
          <QuoteCard quote={activeQuote} isOverlay />
        ) : null}
      </DragOverlay>

      {/* Quick View Sheet */}
      <Sheet open={!!quickViewQuote} onOpenChange={(open) => !open && setQuickViewQuote(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold">
                #{quickViewQuote?.quote_number}
              </SheetTitle>
              <Badge variant="secondary">
                {quickViewQuote && QUOTE_STATUS_CONFIG[quickViewQuote.status]?.label}
              </Badge>
            </div>
            <SheetDescription className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                {quickViewQuote?.client_company || quickViewQuote?.client_name || "Sem cliente"}
              </span>
              <span className="text-xs">
                Criado em: {quickViewQuote?.created_at && new Date(quickViewQuote.created_at).toLocaleDateString()}
              </span>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" /> Resumo dos Itens
              </h4>
              <div className="space-y-3">
                {quickViewQuote?.items?.map((item, idx) => (
                  <div key={idx} className="flex gap-3 text-sm p-3 rounded-lg border bg-muted/30">
                    <div className="h-10 w-10 rounded bg-background border flex items-center justify-center shrink-0">
                      {item.product_image_url ? (
                        <img src={item.product_image_url} alt={item.product_name} className="h-full w-full object-contain" />
                      ) : (
                        <PackageX className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product_name}</p>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{item.quantity} un.</span>
                        <span>{formatCurrency(item.unit_price)} / un.</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(quickViewQuote?.subtotal || 0)}</span>
              </div>
              {quickViewQuote?.discount_amount && quickViewQuote.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Desconto ({quickViewQuote.discount_percent}%)</span>
                  <span>-{formatCurrency(quickViewQuote.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(quickViewQuote?.total || 0)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={() => navigate(`/orcamentos/${quickViewQuote?.id}`)}>
                Ver Detalhes Completos
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DndContext>
  );
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

function KanbanColumn({ 
  status, 
  quotes, 
  onQuoteClick, 
  onQuickView,
  isReadOnly = false,
  selectedIds,
  onToggleSelection,
  stockIssues
}: KanbanColumnProps) {
  const config = QUOTE_STATUS_CONFIG[status];
  const quoteIds = useMemo(() => quotes.map((q) => q.id!), [quotes]);

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
      <div className="p-4 border-b border-border/40 bg-card/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("w-2 h-2 rounded-full", config?.badgeClassName)} />
            <h3 className="font-display font-bold text-sm truncate">{config?.label}</h3>
          </div>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
            {quotes.length}
          </Badge>
          {isReadOnly && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          Total: {formatCurrency(quotes.reduce((s, i) => s + (i.total || 0), 0))}
        </p>
      </div>

      <ScrollArea className="flex-1 p-3">
        <SortableContext items={quoteIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {quotes.length === 0 ? (
              <div className="py-10 text-center opacity-40">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p className="text-[11px]">Arraste aqui</p>
              </div>
            ) : (
              quotes.map((quote) => (
                <SortableQuoteCard
                  key={quote.id}
                   quote={quote}
                   onClick={() => onQuoteClick(quote.id!)}
                   onQuickView={() => onQuickView(quote)}
                   disabled={isReadOnly}
                   isSelected={selectedIds.includes(quote.id!)}
                   onToggleSelection={onToggleSelection}
                   hasStockIssue={stockIssues[quote.id!]}
                 />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
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

function SortableQuoteCard({ 
  quote, 
  onClick, 
  onQuickView,
  disabled, 
  isSelected, 
  onToggleSelection,
  hasStockIssue
}: { 
  quote: Quote; 
  onClick: () => void; 
  onQuickView: () => void;
  disabled?: boolean;
  isSelected?: boolean;
  onToggleSelection: (id: string) => void;
  hasStockIssue?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: quote.id!,
    disabled: disabled
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[120px] rounded-xl border-2 border-dashed border-primary/30 bg-primary/5"
      />
    );
  }

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

function QuoteCard({ 
  quote, 
  isOverlay, 
  onClick, 
  onQuickView,
  attributes, 
  listeners, 
  disabled, 
  isSelected, 
  onToggleSelection,
  hasStockIssue 
}: QuoteCardProps & { attributes?: any; listeners?: any }) {
  const { isSupervisorOrAbove } = useRBAC();
  const isHighValue = (quote.total || 0) > 5000;
  
  // Margem Bruta Estimada
  const totalCost = quote.total_cost || 0;
  const totalValue = quote.total || 0;
  const margin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;
  
  const getMarginColor = (m: number) => {
    if (m >= 30) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (m >= 15) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-destructive bg-destructive/10 border-destructive/20";
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer hover:shadow-md transition-all duration-200 border-border/60 bg-card select-none relative",
        isOverlay && "shadow-xl border-primary ring-2 ring-primary/20",
        isHighValue && "border-l-4 border-l-amber-500",
        disabled && "opacity-80 grayscale-[0.3]",
        isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
      )}
      onClick={onClick}
    >
      {onToggleSelection && !isOverlay && (
        <div 
          className="absolute top-2 left-2 z-20" 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(quote.id!);
          }}
        >
          <Checkbox checked={isSelected} className="rounded-sm h-4 w-4 data-[state=checked]:bg-primary border-muted-foreground/30" />
        </div>
      )}

      <CardContent className={cn("p-3 space-y-3", onToggleSelection && "pl-8")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-foreground truncate">#{quote.quote_number}</p>
              {isHighValue && (
                <Badge variant="outline" className="h-4 px-1 text-[8px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Alta Alçada
                </Badge>
              )}
              {isSupervisorOrAbove && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className={cn("h-4 px-1 text-[8px] border", getMarginColor(margin))}>
                        {margin > 0 ? <TrendingUp className="h-2 w-2 mr-0.5" /> : <TrendingDown className="h-2 w-2 mr-0.5" />}
                        {margin.toFixed(1)}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] p-2">
                      <p className="font-bold">Rentabilidade Estimada</p>
                      <p>Valor: {formatCurrency(totalValue)}</p>
                      <p>Custo: {formatCurrency(totalCost)}</p>
                      <p>Lucro: {formatCurrency(totalValue - totalCost)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {hasStockIssue && (
                <Badge variant="destructive" className="h-4 px-1 text-[8px] animate-pulse">
                  <PackageX className="h-2 w-2 mr-1" />
                  Estoque Crítico
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{quote.client_company || quote.client_name || "Sem cliente"}</span>
            </div>
          </div>
          {!disabled && (
            <div {...attributes} {...listeners} className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          {disabled && (
            <div className="p-1 opacity-40">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <Badge variant="secondary" className="text-[10px] h-5 tabular-nums font-bold text-primary">
            {formatCurrency(quote.total || 0)}
          </Badge>
          <div className="flex items-center gap-2 min-w-0">
            {onQuickView && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickView();
                }}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            <span className="text-[9px] text-muted-foreground truncate">
              {quote.updated_at ? new Date(quote.updated_at).toLocaleDateString() : "Recente"}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {quote.status === "pending_approval" && (
          <div className="flex items-center gap-1.5 text-[9px] text-amber-600 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
            <AlertTriangle className="h-3 w-3" />
            <span>Aguardando autorização de desconto</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
