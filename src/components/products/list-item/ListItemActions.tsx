import type { ComponentType, MouseEvent } from "react";
/**
 * Action buttons bar for ProductListItem — desktop & mobile
 */
import { Heart, GitCompare, Share2, FolderPlus, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { QuickAddToQuote } from "../QuickAddToQuote";
import type { Product } from "@/hooks/useProducts";
import type { VariantActionMode } from "../VariantPickerDialog";

interface ListItemActionsProps {
  product: Product;
  isFavorited: boolean;
  isInCompare: boolean;
  canAddToCompare: boolean;
  onFavorite: (e: MouseEvent) => void;
  onCompare: (e: MouseEvent) => void;
  onVariantAction: (mode: VariantActionMode, e: MouseEvent) => void;
  onQuickView: (e: MouseEvent) => void;
}

function ListAction({ label, icon, onClick, className, disabled, pressed, fill, testId, mobile = true }: { label: string; icon: ComponentType<{ className?: string }>; onClick: (event: MouseEvent) => void; className?: string; disabled?: boolean; pressed?: boolean; fill?: boolean; testId?: string; mobile?: boolean }) {
  const ActionIcon = icon;
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full", !mobile && "hidden sm:flex", className)} onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={pressed} data-testid={testId}><ActionIcon className={cn("h-3.5 w-3.5", fill && "fill-current")} /></Button></TooltipTrigger><TooltipContent side="bottom">{label}</TooltipContent></Tooltip>;
}

export function ListItemActions({
  product, isFavorited, isInCompare, canAddToCompare,
  onFavorite, onCompare, onVariantAction, onQuickView,
}: ListItemActionsProps) {
  return (
    <div className={cn(
      "shrink-0 flex items-center gap-0.5",
      "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
      "transition-opacity duration-200"
    )}>
      <ListAction label={isFavorited ? "Remover favorito" : "Favoritar"} icon={Heart} onClick={onFavorite} className={isFavorited ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive"} pressed={isFavorited} fill={isFavorited} testId="product-favorite" />
      <ListAction label="Comparar" icon={GitCompare} onClick={onCompare} className={isInCompare ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"} disabled={!isInCompare && !canAddToCompare} pressed={isInCompare} />

      {/* Desktop-only actions */}
      <div className="hidden sm:flex items-center gap-0.5">
        <ListAction label="Compartilhar" icon={Share2} onClick={(event) => onVariantAction('share', event)} className="text-muted-foreground hover:text-foreground" />
        <ListAction label="Coleção" icon={FolderPlus} onClick={(event) => onVariantAction('collection', event)} className="text-muted-foreground hover:text-foreground" />
        <ListAction label="Orçamento" icon={FileText} onClick={(event) => onVariantAction('quote', event)} className="text-muted-foreground hover:text-foreground" />
      </div>

      {/* Carrinho */}
      <QuickAddToQuote
        productId={product.id} productName={product.name} productSku={product.sku}
        productImageUrl={product.og_image_url || product.images[0]} productPrice={product.price}
        minQuantity={product.minQuantity || 1} variant="icon" className="h-8 w-8"
      />

      {/* Quick View */}
      <ListAction label="Quick View" icon={Eye} onClick={onQuickView} className="text-muted-foreground hover:text-foreground" mobile={false} />
    </div>
  );
}
