/**
 * SortableCartItem - Draggable product card for seller carts
 */

import { useState, useRef, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  Package, Trash2, Minus, Plus, Eye, MoreHorizontal, GripVertical,
  MessageSquare, ChevronDown, Calculator, MoveRight, CopyPlus,
  AlertTriangle,
} from "lucide-react";
import { type SellerCart, type SellerCartItem } from "@/hooks/useSellerCarts";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface SortableCartItemProps {
  item: SellerCartItem;
  index: number;
  otherCarts: SellerCart[];
  companyAccentColor?: string | null;
  stockMap: Map<string, number>;
  onRemove: (id: string, name: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onMoveToCart: (itemId: string, targetCartId: string) => void;
  onDuplicateToCart: (itemId: string, targetCartId: string) => void;
  onNavigate: (path: string) => void;
}

function ProductImage({ item }: { readonly item: SellerCartItem }) {
  if (!item.product_image_url) return <div className="w-full h-full flex items-center justify-center"><Package className="h-12 w-12 text-muted-foreground/30" /></div>;
  return <img src={item.product_image_url} alt={item.product_name} className="w-full h-full object-contain p-4" loading="lazy" />;
}

interface CartActionsMenuProps {
  readonly item: SellerCartItem;
  readonly otherCarts: readonly SellerCart[];
  readonly onMoveToCart: (itemId: string, targetCartId: string) => void;
  readonly onDuplicateToCart: (itemId: string, targetCartId: string) => void;
  readonly onNavigate: (path: string) => void;
  readonly onRemove: (id: string, name: string) => void;
}

function CartActionsMenu(props: CartActionsMenuProps) {
  return <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><DropdownMenu><DropdownMenuTrigger asChild><button data-testid="cart-item-menu-trigger" className="h-7 w-7 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground" aria-label="Mais opções"><MoreHorizontal className="h-3.5 w-3.5" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem data-testid="cart-item-action-view" onClick={() => props.onNavigate(`/produto/${props.item.product_id}`)}><Eye className="h-3.5 w-3.5 mr-2" /> Ver Produto</DropdownMenuItem><DropdownMenuItem data-testid="cart-item-action-simulate" onClick={() => props.onNavigate(`/simulador?product=${props.item.product_id}`)}><Calculator className="h-3.5 w-3.5 mr-2" /> Simular Personalização</DropdownMenuItem>{props.otherCarts.length > 0 && <><DropdownMenuSeparator /><DropdownMenuSub><DropdownMenuSubTrigger data-testid="cart-item-action-move"><MoveRight className="h-3.5 w-3.5 mr-2" /> Mover para...</DropdownMenuSubTrigger><DropdownMenuSubContent>{props.otherCarts.map(cart => <DropdownMenuItem key={cart.id} data-testid="cart-item-move-target" data-target-cart-id={cart.id} onClick={() => props.onMoveToCart(props.item.id, cart.id)}>{cart.company_name}</DropdownMenuItem>)}</DropdownMenuSubContent></DropdownMenuSub><DropdownMenuSub><DropdownMenuSubTrigger data-testid="cart-item-action-duplicate"><CopyPlus className="h-3.5 w-3.5 mr-2" /> Duplicar para...</DropdownMenuSubTrigger><DropdownMenuSubContent>{props.otherCarts.map(cart => <DropdownMenuItem key={cart.id} data-testid="cart-item-duplicate-target" data-target-cart-id={cart.id} onClick={() => props.onDuplicateToCart(props.item.id, cart.id)}>{cart.company_name}</DropdownMenuItem>)}</DropdownMenuSubContent></DropdownMenuSub></>}<DropdownMenuSeparator /><DropdownMenuItem data-testid="cart-item-action-remove" className="text-destructive focus:text-destructive" onClick={() => props.onRemove(props.item.id, props.item.product_name)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Remover</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>;
}

function StockAlert({ stock, low, out }: { readonly stock: number | undefined; readonly low: boolean; readonly out: boolean }) {
  if (!low && !out) return null;
  return <div data-testid={out ? "cart-item-stock-out" : "cart-item-stock-low"} className={cn("absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium", out ? "bg-destructive/90 text-destructive-foreground" : "bg-warning/90 text-warning-foreground")}><AlertTriangle className="h-3 w-3" />{out ? "Sem estoque" : `Estoque: ${stock}`}</div>;
}

function ColorBadge({ item }: { readonly item: SellerCartItem }) {
  if (!item.color_name) return null;
  return <div data-testid="cart-item-color" className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full px-2 py-1"><div className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: item.color_hex || undefined }} /><span data-testid="cart-item-color-name" className="text-[10px] font-medium">{item.color_name}</span></div>;
}

interface CartItemDetailsProps {
  readonly item: SellerCartItem;
  readonly itemTotal: number;
  readonly notesOpen: boolean;
  readonly localNotes: string;
  readonly onNotesOpenChange: (open: boolean) => void;
  readonly onNotesChange: (value: string) => void;
  readonly onDecrement: () => void;
  readonly onIncrement: () => void;
}

function CartItemDetails(props: CartItemDetailsProps) {
  return <div className="p-3 space-y-2">{props.item.product_sku && <span data-testid="cart-item-sku" className="text-[10px] text-muted-foreground font-mono">{props.item.product_sku}</span>}<h4 data-testid="cart-item-name" className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{props.item.product_name}</h4><div className="flex items-center justify-between"><span data-testid="cart-item-unit-price" className="text-sm font-bold text-primary tabular-nums">{formatCurrency(props.item.product_price)}</span></div><div className="flex items-center justify-between pt-1 border-t border-border/30"><div data-testid="cart-item-qty-stepper" className="flex items-center gap-0 border border-border/50 rounded-lg overflow-hidden"><button data-testid="cart-qty-decrement" aria-label="Diminuir quantidade" className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" onClick={props.onDecrement}>{props.item.quantity <= 1 ? <Trash2 data-testid="cart-qty-remove-icon" className="h-3.5 w-3.5 text-destructive" /> : <Minus data-testid="cart-qty-decrement-icon" className="h-3.5 w-3.5" />}</button><span data-testid="cart-qty-badge" data-qty={props.item.quantity} className="h-8 min-w-[40px] flex items-center justify-center text-xs font-bold tabular-nums bg-muted/20 border-x border-border/30">{props.item.quantity.toLocaleString("pt-BR")}</span><button data-testid="cart-qty-increment" aria-label="Aumentar quantidade" className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" onClick={props.onIncrement}><Plus className="h-3.5 w-3.5" /></button></div><span data-testid="cart-item-total" className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(props.itemTotal)}</span></div><Collapsible open={props.notesOpen} onOpenChange={props.onNotesOpenChange}><CollapsibleTrigger asChild><button data-testid="cart-item-notes-toggle" className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full" aria-label="Recolher"><MessageSquare className="h-3 w-3" />{props.item.notes ? "Observações" : "Adicionar observação"}<ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", props.notesOpen && "rotate-180")} /></button></CollapsibleTrigger><CollapsibleContent className="pt-1.5"><Textarea data-testid="cart-item-notes-input" value={props.localNotes} onChange={event => props.onNotesChange(event.target.value)} placeholder="Ex: personalizar com logo do cliente..." className="text-xs min-h-[60px] resize-none" rows={2} /></CollapsibleContent></Collapsible></div>;
}

export const SortableCartItem = memo(function SortableCartItem({
  item, index, otherCarts, companyAccentColor, stockMap,
  onRemove, onUpdateQuantity, onUpdateNotes, onMoveToCart, onDuplicateToCart, onNavigate,
}: SortableCartItemProps) {
  const [notesOpen, setNotesOpen] = useState(!!item.notes);
  const [localNotes, setLocalNotes] = useState(item.notes || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const itemTotal = item.product_price * item.quantity;
  const stock = stockMap.get(item.product_id);
  const isLowStock = stock !== undefined && stock < item.quantity;
  const isOutOfStock = stock !== undefined && stock === 0;

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdateNotes(item.id, value), 800);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      data-testid="cart-item"
      data-cart-item-id={item.id}
      data-product-id={item.product_id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={cn(
        "overflow-hidden group hover:border-primary/20 transition-all duration-200",
        isDragging && "shadow-xl ring-2 ring-primary/30",
        isOutOfStock && "opacity-60"
      )}>
        {companyAccentColor && (
          <div className="h-1 w-full" style={{ backgroundColor: companyAccentColor }} />
        )}

        {/* Product image */}
        <div className="relative aspect-square bg-muted/30">
          <button
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 z-10 h-7 w-7 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
           aria-label="Arrastar">
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <div
            data-testid="cart-item-image"
            className="w-full h-full cursor-pointer"
            onClick={() => onNavigate(`/produto/${item.product_id}`)}
          >
            <ProductImage item={item} />
          </div>

          {/* Quick view overlay */}
          <div
            data-testid="cart-item-view"
            className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => onNavigate(`/produto/${item.product_id}`)}
          >
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              <Eye className="h-3.5 w-3.5" />
              Ver Produto
            </Button>
          </div>

          <CartActionsMenu item={item} otherCarts={otherCarts} onMoveToCart={onMoveToCart} onDuplicateToCart={onDuplicateToCart} onNavigate={onNavigate} onRemove={onRemove} />

          <StockAlert stock={stock} low={isLowStock} out={isOutOfStock} />
          <ColorBadge item={item} />
        </div>

        <CartItemDetails item={item} itemTotal={itemTotal} notesOpen={notesOpen} localNotes={localNotes} onNotesOpenChange={setNotesOpen} onNotesChange={handleNotesChange} onDecrement={() => item.quantity <= 1 ? onRemove(item.id, item.product_name) : onUpdateQuantity(item.id, item.quantity - 1)} onIncrement={() => onUpdateQuantity(item.id, item.quantity + 1)} />
      </Card>
    </motion.div>
  );
});

SortableCartItem.displayName = 'SortableCartItem';
