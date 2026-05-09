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
  User, 
  Building2, 
  GripVertical, 
  AlertTriangle, 
  Lock,
  Check,
  PackageX,
  PackageSearch
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Quote } from "@/hooks/quotes/quoteTypes";
import { useRBAC } from "@/hooks/useRBAC";
import confetti from "canvas-confetti";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

const KANBAN_STATUSES = ["draft", "pending", "sent", "approved", "rejected"] as const;
type KanbanStatus = (typeof KANBAN_STATUSES)[number];

import { useQuotesStockStatus } from "@/hooks/quote/useQuotesStockStatus";

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
  const { updateQuoteStatus, isLoading: quotesLoading } = useQuotes();
  const { isSupervisorOrAbove } = useRBAC();
  const navigate = useNavigate();

  const quoteIdsForStock = useMemo(() => initialQuotes.map(q => q.id!).filter(Boolean), [initialQuotes]);
  const { data: stockIssues } = useQuotesStockStatus(quoteIdsForStock);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);

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

    // Check if dropped over a column or another card
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
            isReadOnly={['approved', 'rejected'].includes(status) && !isSupervisorOrAbove}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
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
    </DndContext>
  );
}

interface KanbanColumnProps {
  status: KanbanStatus;
  quotes: Quote[];
  onQuoteClick: (id: string) => void;
  isReadOnly?: boolean;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
}

function KanbanColumn({ 
  status, 
  quotes, 
  onQuoteClick, 
  isReadOnly = false,
  selectedIds,
  onToggleSelection
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
                   disabled={isReadOnly}
                   isSelected={selectedIds.includes(quote.id!)}
                   onToggleSelection={onToggleSelection}
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
  disabled?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
}

function SortableQuoteCard({ 
  quote, 
  onClick, 
  disabled, 
  isSelected, 
  onToggleSelection 
}: { 
  quote: Quote; 
  onClick: () => void; 
  disabled?: boolean;
  isSelected?: boolean;
  onToggleSelection: (id: string) => void;
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
        attributes={attributes} 
        listeners={listeners} 
        disabled={disabled} 
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
      />
    </div>
  );
}

function QuoteCard({ quote, isOverlay, onClick, attributes, listeners, disabled }: QuoteCardProps & { attributes?: any; listeners?: any }) {
  const isHighValue = (quote.total || 0) > 5000;

  return (
    <Card
      className={cn(
        "group cursor-pointer hover:shadow-md transition-all duration-200 border-border/60 bg-card select-none",
        isOverlay && "shadow-xl border-primary ring-2 ring-primary/20",
        isHighValue && "border-l-4 border-l-amber-500",
        disabled && "opacity-80 grayscale-[0.3]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-foreground truncate">#{quote.quote_number}</p>
              {isHighValue && (
                <Badge variant="outline" className="h-4 px-1 text-[8px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Alta Alçada
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
          <div className="flex items-center gap-1.5 min-w-0">
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

