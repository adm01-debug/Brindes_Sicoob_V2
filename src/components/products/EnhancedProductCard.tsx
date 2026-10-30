/**
 * EnhancedProductCard - Card de produto melhorado com hover preview e ações rápidas
 * Inclui preview expandido, quick-add e badges de urgência
 */

import { type MouseEvent, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Eye,
  Share2,
  GitCompare,
  ShoppingCart,
  Package,
  Sparkles,
  Clock,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { PriceFreshnessBadge } from "./PriceFreshnessBadge";

interface EnhancedProductCardProps {
  product: Product;
  onClick?: () => void;
  onQuickAdd?: (product: Product, quantity: number) => void;
  onToggleFavorite?: (productId: string) => void;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  onShare?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  isFavorited?: boolean;
  isInCompare?: boolean;
  canAddToCompare?: boolean;
  showUrgencyBadge?: boolean;
  urgencyType?: "limited-stock" | "trending" | "ending-soon";
  urgencyText?: string;
}

function normalizedCardProps(props: EnhancedProductCardProps) {
  return { ...props, isFavorited: props.isFavorited ?? false, isInCompare: props.isInCompare ?? false, canAddToCompare: props.canAddToCompare ?? true, showUrgencyBadge: props.showUrgencyBadge ?? false, urgencyType: props.urgencyType ?? "limited-stock" as const };
}

function QuickActions({ product, isFavorited, isInCompare, canAddToCompare, onToggleFavorite, onToggleCompare, onQuickView, onShare }: Pick<EnhancedProductCardProps, "product" | "isFavorited" | "isInCompare" | "canAddToCompare" | "onToggleFavorite" | "onToggleCompare" | "onQuickView" | "onShare">) {
  return (
    <div className="absolute right-3 top-12 flex flex-col gap-2 z-20 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-x-0 md:translate-x-4">
      <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="icon" aria-label="Favoritar" data-testid="product-card-favorite" aria-pressed={isFavorited} className={cn("h-10 w-10 rounded-full bg-card/95 backdrop-blur-md shadow-lg hover:scale-110 transition-all", isFavorited && "bg-destructive/10 border-destructive/30")} onClick={(event: MouseEvent) => { event.stopPropagation(); onToggleFavorite?.(product.id); }}><Heart className={cn("h-4 w-4", isFavorited && "fill-destructive text-destructive")} /></Button></TooltipTrigger><TooltipContent side="left">{isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="icon" aria-label="GitCompare" className={cn("h-10 w-10 rounded-full bg-card/95 backdrop-blur-md shadow-lg hover:scale-110 transition-all", isInCompare && "bg-primary/10 border-primary/30")} onClick={(event: MouseEvent) => { event.stopPropagation(); onToggleCompare?.(product.id); }} disabled={!isInCompare && !canAddToCompare}><GitCompare className={cn("h-4 w-4", isInCompare && "text-primary")} /></Button></TooltipTrigger><TooltipContent side="left">{isInCompare ? "Remover da comparação" : "Comparar"}</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="icon" aria-label="Visualizar" className="h-10 w-10 rounded-full bg-card/95 backdrop-blur-md shadow-lg hover:scale-110 transition-all" onClick={(event: MouseEvent) => { event.stopPropagation(); onQuickView?.(product); }}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="left">Visualização rápida</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="icon" aria-label="Compartilhar" className="h-10 w-10 rounded-full bg-card/95 backdrop-blur-md shadow-lg hover:scale-110 transition-all" onClick={(event: MouseEvent) => { event.stopPropagation(); onShare?.(product); }}><Share2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="left">Compartilhar</TooltipContent></Tooltip>
    </div>
  );
}

function QuickAddOverlay({ visible, product, quantity, onQuantity, onQuickAdd }: { visible: boolean; product: Product; quantity: number; onQuantity: (quantity: number) => void; onQuickAdd?: (product: Product, quantity: number) => void }) {
  if (!visible || !onQuickAdd) return null;
  return <motion.div className="absolute bottom-0 left-0 right-0 p-4 z-20" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.2 }} onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-2 bg-card/95 backdrop-blur-md rounded-full p-2 shadow-xl border border-border/50"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade">-</Button><span className="w-8 text-center font-medium text-sm">{quantity}</span><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onQuantity(quantity + 1)} aria-label="Aumentar quantidade">+</Button><Button data-testid="product-card-quick-add" size="sm" className="flex-1 rounded-full gap-2" onClick={() => onQuickAdd(product, quantity)}><ShoppingCart className="h-4 w-4" />Adicionar</Button></div></motion.div>;
}

function ColorPreview({ product, hovered }: { product: Product; hovered: boolean }) {
  if (!product.colors?.length) return null;
  return <motion.div className={cn("absolute bottom-4 left-4 z-10 transition-all duration-300", hovered ? "opacity-0" : "opacity-100")}><div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full px-2 py-1">{product.colors.slice(0, 4).map((color, index) => <div key={index} className="w-4 h-4 rounded-full border-2 border-card shadow-sm" style={{ backgroundColor: color.hex }} />)}{product.colors.length > 4 && <span className="text-[10px] text-muted-foreground ml-1">+{product.colors.length - 4}</span>}</div></motion.div>;
}

function formatProductPrice(price: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function ProductCardContent({ product, hovered }: { product: Product; hovered: boolean }) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between"><Badge variant="secondary" className="text-[10px]">{product.supplier?.name || "Fornecedor"}</Badge></div>
      <h3 data-testid="product-card-name" data-product-name={product.name} className="font-display font-medium text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">{product.name}</h3>
      <div className="flex items-end justify-between"><div><p className="text-[10px] text-muted-foreground">A partir de</p><span className="text-lg font-bold inline-flex items-center gap-1.5">{formatProductPrice(product.price)}<PriceFreshnessBadge priceUpdatedAt={product.priceUpdatedAt} thresholdDays={product.priceFreshnessThresholdDays} variant="icon-only" /></span></div><div className="flex items-center gap-1 text-xs text-muted-foreground"><Package className="h-3 w-3" />{product.stock?.toLocaleString("pt-BR")} un</div></div>
      <motion.div className="flex items-center justify-center gap-1 text-xs text-primary pt-2 border-t border-border/50" animate={{ x: hovered ? 5 : 0 }}>Ver detalhes<ChevronRight className="h-3 w-3" /></motion.div>
    </div>
  );
}

function HoverPreview({ visible, product }: { visible: boolean; product: Product }) {
  if (!visible) return null;
  const materials = Array.isArray(product.materials) ? product.materials : [];
  return (
    <motion.div className="absolute left-full top-0 ml-4 w-72 bg-card rounded-xl shadow-2xl border z-50 overflow-hidden" initial={{ opacity: 0, x: -20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -20, scale: 0.95 }} transition={{ duration: 0.2 }}><div className="p-4 space-y-3"><h4 className="font-semibold text-sm">{product.name}</h4><p className="text-xs text-muted-foreground line-clamp-3">{product.description}</p>{materials.length > 0 && <div className="flex flex-wrap gap-1">{materials.slice(0, 3).map((material, index) => <Badge key={index} variant="outline" className="text-[10px]">{material}</Badge>)}</div>}<div className="grid grid-cols-2 gap-2 text-xs"><div><p className="text-muted-foreground">Mín. pedido</p><p className="font-medium">{product.minQuantity || 1} un</p></div><div><p className="text-muted-foreground">Prazo</p><p className="font-medium">Consultar</p></div></div><Button className="w-full" size="sm">Ver produto completo</Button></div></motion.div>
  );
}

function UrgencyBadge({ visible, type, text }: { visible: boolean; type: NonNullable<EnhancedProductCardProps['urgencyType']>; text?: string }) {
  if (!visible) return null;
  const configs = {
    "limited-stock": { icon: <Package className="h-3 w-3" />, text: text || "Estoque limitado", className: "bg-destructive/90 text-destructive-foreground" },
    trending: { icon: <TrendingUp className="h-3 w-3" />, text: text || "Em alta", className: "bg-primary/90 text-primary-foreground" },
    "ending-soon": { icon: <Clock className="h-3 w-3" />, text: text || "Termina em breve", className: "bg-warning/90 text-warning-foreground" },
  };
  const config = configs[type];
  return <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={cn("absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-lg", config.className)}>{config.icon}<span>{config.text}</span></motion.div>;
}

function CardImageArea({ props, hovered, loaded, setLoaded, quantity, setQuantity }: { props: ReturnType<typeof normalizedCardProps>; hovered: boolean; loaded: boolean; setLoaded: (value: boolean) => void; quantity: number; setQuantity: (value: number) => void }) {
  const { product, isFavorited, isInCompare, canAddToCompare, onToggleFavorite, onToggleCompare, onQuickView, onShare, onQuickAdd } = props;
  return (
    <div className="relative aspect-[4/5] overflow-hidden product-img-container">
      {!loaded && <div className="absolute inset-0 bg-muted/30" />}
      <motion.img src={product.images[0]} alt={product.name} className={cn("w-full h-full object-contain transition-all duration-700 ease-out", loaded ? "opacity-100 blur-0 scale-100" : "opacity-40 blur-md scale-105")} animate={{ scale: hovered ? 1.05 : 1 }} onLoad={() => setLoaded(true)} />
      <motion.div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" initial={{ opacity: 0 }} animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.3 }} />
      {product.featured && <Badge className="absolute top-3 right-3 z-10 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-lg"><Sparkles className="h-3 w-3 mr-1" />Destaque</Badge>}
      <QuickActions product={product} isFavorited={isFavorited} isInCompare={isInCompare} canAddToCompare={canAddToCompare} onToggleFavorite={onToggleFavorite} onToggleCompare={onToggleCompare} onQuickView={onQuickView} onShare={onShare} />
      <AnimatePresence><QuickAddOverlay visible={hovered} product={product} quantity={quantity} onQuantity={setQuantity} onQuickAdd={onQuickAdd} /></AnimatePresence>
      <ColorPreview product={product} hovered={hovered} />
    </div>
  );
}

export function EnhancedProductCard(props: EnhancedProductCardProps) {
  const normalized = normalizedCardProps(props);
  const { product, onClick, showUrgencyBadge, urgencyType, urgencyText } = normalized;
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [quickAddQuantity, setQuickAddQuantity] = useState(1);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Mostrar preview após 500ms de hover
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPreview(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowPreview(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card border border-border/50",
        "transition-all duration-300 ease-out cursor-pointer",
        "hover:border-primary/30 hover:shadow-2xl hover:-translate-y-1",
        isHovered && "ring-2 ring-primary/20"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <UrgencyBadge visible={showUrgencyBadge} type={urgencyType} text={urgencyText} />
      <CardImageArea props={normalized} hovered={isHovered} loaded={imageLoaded} setLoaded={setImageLoaded} quantity={quickAddQuantity} setQuantity={setQuickAddQuantity} />

      <ProductCardContent product={product} hovered={isHovered} />

      {/* Hover Preview Popup */}
      <AnimatePresence><HoverPreview visible={showPreview} product={product} /></AnimatePresence>
    </article>
  );
}
