/**
 * DraggableQuoteItems - Lista de itens do orçamento com drag-and-drop
 * Permite reordenar itens arrastando e soltando
 */

import { type ChangeEvent, type CSSProperties, type ReactNode, Fragment, useState } from "react";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Package, Trash2, ChevronDown, ChevronUp, Palette, AlertTriangle, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { QuoteItem } from "@/hooks/quotes/quoteTypes";

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
  if (!item.product_image_url) return <div className="w-full h-full flex items-center justify-center">
    <Package className="h-6 w-6 text-muted-foreground" /></div>;
  return <img src={item.product_image_url} alt={item.product_name} className="w-full h-full object-cover" loading="lazy" />;
}

function ProductBadges({ item }: { item: QuoteItem }) {
  const personalized = Boolean(item.personalizations?.length);
  return <div className="flex items-center gap-2 mt-1 flex-wrap"><Badge variant="outline" className="text-[10px] font-mono">{item.product_sku}</Badge>
    {item.color_name && <Badge variant="secondary" className="text-[10px] gap-1"
      style={{ backgroundColor: item.color_hex ? `${item.color_hex}20` : undefined, borderColor: item.color_hex }}>
      <div className="w-2 h-2 rounded-full border" style={{ backgroundColor: item.color_hex }} />{item.color_name}</Badge>}
    {personalized && <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/10">
      <Palette className="h-2.5 w-2.5" />{item.personalizations?.length} gravação(ões)</Badge>}
  </div>;
}

function StockWarning({ item }: { item: QuoteItem }) {
  const stock = item.stock_available;
  if (stock === null || stock === undefined || item.quantity <= stock) return null;
  return <TooltipProvider><Tooltip><TooltipTrigger asChild><div className="flex items-center justify-center p-1 rounded-full bg-destructive/10 text-destructive animate-pulse">
    <AlertTriangle className="h-3.5 w-3.5" /></div></TooltipTrigger><TooltipContent>
    <p className="text-xs">Estoque insuficiente: {stock} disponíveis</p></TooltipContent></Tooltip></TooltipProvider>;
}

function ItemInputs({ props, total }: { props: SortableItemProps; total: number }) {
  const { item, onUpdateQuantity, onUpdatePrice, formatCurrency } = props;
  return <div className="flex items-center gap-3 flex-wrap"><div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground">Qtd:</span><Input type="number" min={1} value={item.quantity}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onUpdateQuantity(parseInt(event.target.value) || 1)} className="w-20 h-8 text-sm" />
    <StockWarning item={item} /></div><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Preço:</span>
      <Input type="number" step="0.01" min={0} value={item.unit_price}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onUpdatePrice(parseFloat(event.target.value) || 0)} className="w-28 h-8 text-sm" />
    </div><div className="ml-auto text-right"><p className="text-xs text-muted-foreground">Subtotal</p>
      <p className="font-semibold text-sm">{formatCurrency(total)}</p></div></div>;
}

function PersonalizationToggle({ expanded, onToggle }: { expanded: boolean; onToggle?: () => void }) {
  if (!onToggle) return null;
  return <div className="mt-2"><Button variant="ghost" size="sm" className={cn(
    'w-full justify-between text-sm font-medium rounded-lg border transition-all',
    expanded ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15' : 'bg-accent/50 border-border hover:bg-accent hover:border-primary/20')}
    onClick={onToggle}><span className="flex items-center gap-2"><Palette className="h-4 w-4" />Personalização</span>
    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></div>;
}

function ItemHeader({ props, total, dragHandle }: { props: SortableItemProps; total: number; dragHandle: ReactNode }) {
  const { item, isExpanded, isSelected, onToggleSelection, onRemove, onTogglePersonalization } = props;
  return <div className={cn('p-4 bg-card z-10', isExpanded && 'sticky top-0 border-b border-border/50 shadow-sm')}>
    <div className="flex items-start gap-3">{onToggleSelection && <div className="mt-2.5"><Checkbox checked={isSelected}
      onCheckedChange={onToggleSelection} className="rounded-sm border-muted-foreground/30 data-[state=checked]:bg-primary" /></div>}
      {dragHandle}<div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted"><ProductImage item={item} /></div>
      <div className="flex-1 min-w-0 space-y-2"><div className="flex items-start justify-between gap-2"><div className="min-w-0">
        <h4 className="font-medium text-sm truncate">{item.product_name}</h4><ProductBadges item={item} /></div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button></div><ItemInputs props={props} total={total} /></div>
    </div><PersonalizationToggle expanded={isExpanded} onToggle={onTogglePersonalization} /></div>;
}

function SortableItemCard({ props, total, dragHandle, setNodeRef, style, dragging }: {
  props: SortableItemProps; total: number; dragHandle: ReactNode;
  setNodeRef: (node: HTMLElement | null) => void; style: CSSProperties; dragging: boolean;
}) {
  const { item, index, isExpanded, renderPersonalization, isSelected } = props;
  return <motion.div ref={setNodeRef} style={style} data-testid={`quote-item-${index}`} data-quote-item-id={item.id}
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.2 }}>
    <Card className={cn("transition-all duration-200 overflow-hidden", dragging && "opacity-50 shadow-2xl ring-2 ring-primary",
      "hover:shadow-md", isSelected && "ring-2 ring-primary/40 bg-primary/[0.02]",
      isExpanded && "max-h-[calc(100vh-12rem)] flex flex-col")}>
      <ItemHeader props={props} total={total} dragHandle={dragHandle} />
      {isExpanded && renderPersonalization && <div className="overflow-y-auto flex-1 min-h-0">
        <div className="px-4 pb-4 pt-3 border-t border-primary/20">{renderPersonalization()}</div>
      </div>}
    </Card>
  </motion.div>;
}

function SortableItem(props: SortableItemProps) {
  const { item, index } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id || `item-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  const personalizationTotal = (item.personalizations || []).reduce(
    (sum, p) => sum + (p.total_cost || 0),
    0
  );
  const itemTotal = item.quantity * item.unit_price + personalizationTotal;

  const dragHandle = <button {...attributes} {...listeners} className={cn('mt-2 p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing',
    'touch-none select-none focus:outline-none focus:ring-2 focus:ring-primary transition-colors')} aria-label="Arrastar para reordenar">
    <GripVertical className="h-5 w-5 text-muted-foreground" /></button>;

  return <SortableItemCard props={props} total={itemTotal} dragHandle={dragHandle}
    setNodeRef={setNodeRef} style={style} dragging={isDragging} />;
}

type ItemWithId = QuoteItem & { id: string };

function GroupHeader({ item, onUngroup }: { item: ItemWithId; onUngroup?: (groupId: string) => void }) {
  return <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
    className="flex items-center justify-between px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
      <Layers className="h-4 w-4" />Kit: {item.kit_name}</div>
    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-700 hover:bg-emerald-500/20"
      onClick={() => item.kit_group_id && onUngroup?.(item.kit_group_id)}>Desagrupar</Button>
  </motion.div>;
}

function ItemEntry({ item, previous, index, props }: {
  item: ItemWithId; previous?: ItemWithId; index: number; props: DraggableQuoteItemsProps;
}) {
  const showGroup = item.kit_group_id && (!previous || previous.kit_group_id !== item.kit_group_id);
  return <Fragment>{showGroup && <GroupHeader item={item} onUngroup={props.onUngroup} />}
    <SortableItem item={item} index={index} isExpanded={props.expandedItems?.has(index) ?? false}
      onUpdateQuantity={(quantity) => props.onUpdateQuantity(index, quantity)}
      onUpdatePrice={(price) => props.onUpdatePrice(index, price)} onRemove={() => props.onRemove(index)}
      isSelected={props.selectedIndexes?.has(index)}
      onToggleSelection={props.onToggleSelection ? () => props.onToggleSelection?.(index) : undefined}
      onTogglePersonalization={props.onTogglePersonalization ? () => props.onTogglePersonalization?.(index) : undefined}
      renderPersonalization={props.renderPersonalization ? () => props.renderPersonalization?.(item, index) : undefined}
      formatCurrency={props.formatCurrency} />
  </Fragment>;
}

function ItemsList({ items, props }: { items: ItemWithId[]; props: DraggableQuoteItemsProps }) {
  return <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
    <div className="space-y-5"><AnimatePresence>{items.map((item, index) => <ItemEntry key={item.id}
      item={item} previous={items[index - 1]} index={index} props={props} />)}</AnimatePresence></div>
  </SortableContext>;
}

function ActiveItemOverlay({ item }: { item?: ItemWithId }) {
  if (!item) return <DragOverlay />;
  return <DragOverlay><Card className="shadow-2xl ring-2 ring-primary opacity-90"><CardContent className="p-4">
    <div className="flex items-center gap-3"><GripVertical className="h-5 w-5 text-muted-foreground" />
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
        {item.product_image_url ? <img src={item.product_image_url} alt={item.product_name}
          className="w-full h-full object-cover rounded-lg" loading="lazy" /> : <Package className="h-5 w-5 text-muted-foreground" />}
      </div><div><p className="font-medium text-sm">{item.product_name}</p>
        <p className="text-xs text-muted-foreground">{item.product_sku}</p></div>
    </div></CardContent></Card></DragOverlay>;
}

function EmptyItems() {
  return <div className="text-center py-12 border-2 border-dashed rounded-xl">
    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
    <p className="text-muted-foreground font-medium">Nenhum item adicionado</p>
    <p className="text-sm text-muted-foreground/70 mt-1">Pesquise e adicione produtos ao orçamento</p>
  </div>;
}

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
    })
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

  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <ItemsList items={itemsWithIds} props={props} /><ActiveItemOverlay item={activeItem ?? undefined} />
  </DndContext>;
}
