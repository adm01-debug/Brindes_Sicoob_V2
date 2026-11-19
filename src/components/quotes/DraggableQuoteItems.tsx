/**
 * DraggableQuoteItems - Lista de itens do orçamento com drag-and-drop
 * Permite reordenar itens arrastando e soltando
 */

import { type ChangeEvent, type CSSProperties, type ReactNode, Fragment, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Package,
  Trash2,
  ChevronDown,
  ChevronUp,
  Palette,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';

interface DraggableQuoteItemsProps {
  items: QuoteItem[];
  onReorder: (items: QuoteItem[]) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdatePrice: (index: number, price: number) => void;
  onRemove: (index: number) => void;
  onTogglePersonalization?: (index: number) => void;
  expandedItems?: Set<number>;
  renderPersonalization?: (item: QuoteItem, index: number) => ReactNode;
  formatCurrency: (value: number) => string;
  selectedIndexes?: Set<number>;
  onToggleSelection?: (index: number) => void;
  onUngroup?: (groupId: string) => void;
}

interface SortableItemProps {
  item: QuoteItem;
  index: number;
  isExpanded: boolean;
  onUpdateQuantity: (quantity: number) => void;
  onUpdatePrice: (price: number) => void;
  onRemove: () => void;
  onTogglePersonalization?: () => void;
  renderPersonalization?: () => ReactNode;
  formatCurrency: (value: number) => string;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

function ProductImage({ item }: { item: QuoteItem }) {
  if (!item.product_image_url)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  return (
    <img
      src={item.product_image_url}
      alt={item.product_name}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  );
}

function ProductBadges({ item }: { item: QuoteItem }) {
  const personalized = Boolean(item.personalizations?.length);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="font-mono text-[10px]">
        {item.product_sku}
      </Badge>
      {item.color_name && (
        <Badge
          variant="secondary"
          className="gap-1 text-[10px]"
          style={{
            backgroundColor: item.color_hex ? `${item.color_hex}20` : undefined,
            borderColor: item.color_hex,
          }}
        >
          <div
            className="h-2 w-2 rounded-full border"
            style={{ backgroundColor: item.color_hex }}
          />
          {item.color_name}
        </Badge>
      )}
      {personalized && (
        <Badge variant="secondary" className="gap-1 bg-primary/10 text-[10px]">
          <Palette className="h-2.5 w-2.5" />
          {item.personalizations?.length} gravação(ões)
        </Badge>
      )}
    </div>
  );
}

function StockWarning({ item }: { item: QuoteItem }) {
  const stock = item.stock_available;
  if (stock === null || stock === undefined || item.quantity <= stock) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex animate-pulse items-center justify-center rounded-full bg-destructive/10 p-1 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Estoque insuficiente: {stock} disponíveis</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ItemInputs({ props, total }: { props: SortableItemProps; total: number }) {
  const { item, onUpdateQuantity, formatCurrency } = props;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Qtd:</span>
        <Input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onUpdateQuantity(parseInt(event.target.value) || 1)
          }
          className="h-8 w-20 text-sm"
        />
        <StockWarning item={item} />
      </div>
      <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Preço do catálogo:</span>
        <span className="text-sm font-medium tabular-nums">{formatCurrency(item.unit_price)}</span>
      </div>
      <div className="ml-auto text-right">
        <p className="text-xs text-muted-foreground">Subtotal</p>
        <p className="text-sm font-semibold">{formatCurrency(total)}</p>
      </div>
    </div>
  );
}

function PersonalizationToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle?: () => void;
}) {
  if (!onToggle) return null;
  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'w-full justify-between rounded-lg border text-sm font-medium transition-all',
          expanded
            ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
            : 'border-border bg-accent/50 hover:border-primary/20 hover:bg-accent',
        )}
        onClick={onToggle}
      >
        <span className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Personalização
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function -- formatacao do prettier elevou a contagem; divisao fora do escopo desta recuperacao
function ItemHeader({
  props,
  total,
  dragHandle,
}: {
  props: SortableItemProps;
  total: number;
  dragHandle: ReactNode;
}) {
  const { item, isExpanded, isSelected, onToggleSelection, onRemove, onTogglePersonalization } =
    props;
  return (
    <div
      className={cn(
        'z-10 bg-card p-4',
        isExpanded && 'sticky top-0 border-b border-border/50 shadow-sm',
      )}
    >
      <div className="flex items-start gap-3">
        {onToggleSelection && (
          <div className="mt-2.5">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              className="rounded-sm border-muted-foreground/30 data-[state=checked]:bg-primary"
            />
          </div>
        )}
        {dragHandle}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          <ProductImage item={item} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-medium">{item.product_name}</h4>
              <ProductBadges item={item} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <ItemInputs props={props} total={total} />
        </div>
      </div>
      <PersonalizationToggle expanded={isExpanded} onToggle={onTogglePersonalization} />
    </div>
  );
}

function SortableItemCard({
  props,
  total,
  dragHandle,
  setNodeRef,
  style,
  dragging,
}: {
  props: SortableItemProps;
  total: number;
  dragHandle: ReactNode;
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
  dragging: boolean;
}) {
  const { item, index, isExpanded, renderPersonalization, isSelected } = props;
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      data-testid={`quote-item-${index}`}
      data-quote-item-id={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'overflow-hidden transition-all duration-200',
          dragging && 'opacity-50 shadow-2xl ring-2 ring-primary',
          'hover:shadow-md',
          isSelected && 'bg-primary/[0.02] ring-2 ring-primary/40',
          isExpanded && 'flex max-h-[calc(100vh-12rem)] flex-col',
        )}
      >
        <ItemHeader props={props} total={total} dragHandle={dragHandle} />
        {isExpanded && renderPersonalization && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-t border-primary/20 px-4 pb-4 pt-3">
              {renderPersonalization()}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function SortableItem(props: SortableItemProps) {
  const { item, index } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id || `item-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  const personalizationTotal = (item.personalizations || []).reduce(
    (sum, p) => sum + (p.total_cost || 0),
    0,
  );
  const itemTotal = item.quantity * item.unit_price + personalizationTotal;

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className={cn(
        'mt-2 cursor-grab rounded p-1 hover:bg-muted active:cursor-grabbing',
        'touch-none select-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
      )}
      aria-label="Arrastar para reordenar"
    >
      <GripVertical className="h-5 w-5 text-muted-foreground" />
    </button>
  );

  return (
    <SortableItemCard
      props={props}
      total={itemTotal}
      dragHandle={dragHandle}
      setNodeRef={setNodeRef}
      style={style}
      dragging={isDragging}
    />
  );
}

type ItemWithId = QuoteItem & { id: string };

function GroupHeader({
  item,
  onUngroup,
}: {
  item: ItemWithId;
  onUngroup?: (groupId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
        <Layers className="h-4 w-4" />
        Kit: {item.kit_name}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[10px] text-emerald-700 hover:bg-emerald-500/20"
        onClick={() => item.kit_group_id && onUngroup?.(item.kit_group_id)}
      >
        Desagrupar
      </Button>
    </motion.div>
  );
}

function ItemEntry({
  item,
  previous,
  index,
  props,
}: {
  item: ItemWithId;
  previous?: ItemWithId;
  index: number;
  props: DraggableQuoteItemsProps;
}) {
  const showGroup = item.kit_group_id && (!previous || previous.kit_group_id !== item.kit_group_id);
  return (
    <Fragment>
      {showGroup && <GroupHeader item={item} onUngroup={props.onUngroup} />}
      <SortableItem
        item={item}
        index={index}
        isExpanded={props.expandedItems?.has(index) ?? false}
        onUpdateQuantity={(quantity) => props.onUpdateQuantity(index, quantity)}
        onUpdatePrice={(price) => props.onUpdatePrice(index, price)}
        onRemove={() => props.onRemove(index)}
        isSelected={props.selectedIndexes?.has(index)}
        onToggleSelection={
          props.onToggleSelection ? () => props.onToggleSelection?.(index) : undefined
        }
        onTogglePersonalization={
          props.onTogglePersonalization ? () => props.onTogglePersonalization?.(index) : undefined
        }
        renderPersonalization={
          props.renderPersonalization ? () => props.renderPersonalization?.(item, index) : undefined
        }
        formatCurrency={props.formatCurrency}
      />
    </Fragment>
  );
}

function ItemsList({ items, props }: { items: ItemWithId[]; props: DraggableQuoteItemsProps }) {
  return (
    <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-5">
        <AnimatePresence>
          {items.map((item, index) => (
            <ItemEntry
              key={item.id}
              item={item}
              previous={items[index - 1]}
              index={index}
              props={props}
            />
          ))}
        </AnimatePresence>
      </div>
    </SortableContext>
  );
}

function ActiveItemOverlay({ item }: { item?: ItemWithId }) {
  if (!item) return <DragOverlay />;
  return (
    <DragOverlay>
      <Card className="opacity-90 shadow-2xl ring-2 ring-primary">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              {item.product_image_url ? (
                <img
                  src={item.product_image_url}
                  alt={item.product_name}
                  className="h-full w-full rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <Package className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{item.product_name}</p>
              <p className="text-xs text-muted-foreground">{item.product_sku}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DragOverlay>
  );
}

function EmptyItems() {
  return (
    <div className="rounded-xl border-2 border-dashed py-12 text-center">
      <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
      <p className="font-medium text-muted-foreground">Nenhum item adicionado</p>
      <p className="mt-1 text-sm text-muted-foreground/70">
        Pesquise e adicione produtos ao orçamento
      </p>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function -- formatacao do prettier elevou a contagem; divisao fora do escopo desta recuperacao
export function DraggableQuoteItems(props: DraggableQuoteItemsProps) {
  const { items, onReorder } = props;
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Gerar IDs únicos para items sem ID
  const itemsWithIds = items.map((item, index) => ({
    ...item,
    id: item.id || `item-${index}`,
  }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = itemsWithIds.findIndex((item) => item.id === active.id);
      const newIndex = itemsWithIds.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(itemsWithIds, oldIndex, newIndex);
      onReorder(reordered);
    }
  };

  const activeItem = activeId ? itemsWithIds.find((item) => item.id === activeId) : null;

  if (items.length === 0) return <EmptyItems />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ItemsList items={itemsWithIds} props={props} />
      <ActiveItemOverlay item={activeItem ?? undefined} />
    </DndContext>
  );
}
