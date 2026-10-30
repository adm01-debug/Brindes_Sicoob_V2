/**
 * Table row action buttons — extracted from ProductTableView
 */
import { Heart, GitCompare, Share2, FolderPlus, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QuickAddToQuote } from "../QuickAddToQuote";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import type { VariantActionMode } from "../VariantPickerDialog";
import { showUndoToast } from "@/utils/undoToast";
import type { ComponentType, MouseEvent } from "react";

interface TableRowActionsProps {
  product: Product;
  isFavorite: boolean;
  isInCompare: boolean;
  canAddToCompare: boolean;
  onToggleFavorite?: (id: string) => void;
  onToggleCompare?: (id: string) => { added: boolean; isFull: boolean };
  onOpenVariantPicker: (product: Product, mode: VariantActionMode) => void;
  onOpenQuickView: (product: Product) => void;
}

function TableAction({ label, icon, onClick, className, disabled, pressed, fill, testId }: { label: string; icon: ComponentType<{ className?: string }>; onClick: (event: MouseEvent) => void; className?: string; disabled?: boolean; pressed?: boolean; fill?: boolean; testId?: string }) {
  const ActionIcon = icon;
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full", className)} disabled={disabled} onClick={onClick} aria-label={label} aria-pressed={pressed} data-testid={testId}><ActionIcon className={cn("h-3 w-3", fill && "fill-current")} /></Button></TooltipTrigger><TooltipContent side="top">{label}</TooltipContent></Tooltip>;
}

export function TableRowActions({
  product, isFavorite: fav, isInCompare: inComp, canAddToCompare,
  onToggleFavorite, onToggleCompare, onOpenVariantPicker, onOpenQuickView,
}: TableRowActionsProps) {
  const favorite = (event: MouseEvent) => {
    event.stopPropagation();
    if (!fav) { onOpenVariantPicker(product, 'favorite'); return; }
    onToggleFavorite?.(product.id);
    showUndoToast({ title: `"${product.name}" removido dos favoritos`, onUndo: () => onToggleFavorite?.(product.id) });
  };
  const compare = (event: MouseEvent) => {
    event.stopPropagation();
    if (!inComp) { onOpenVariantPicker(product, 'compare'); return; }
    onToggleCompare?.(product.id);
    showUndoToast({ title: `"${product.name}" removido da comparação`, onUndo: () => onToggleCompare?.(product.id) });
  };
  const variantAction = (mode: VariantActionMode) => (event: MouseEvent) => { event.stopPropagation(); onOpenVariantPicker(product, mode); };
  const quickView = (event: MouseEvent) => { event.stopPropagation(); onOpenQuickView(product); };
  return (
    <div className="flex items-center justify-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <TableAction label={fav ? "Remover favorito" : "Favoritar"} icon={Heart} onClick={favorite} className={fav ? "text-destructive bg-destructive/10" : undefined} pressed={fav} fill={fav} testId="product-favorite" />
      <TableAction label="Comparar" icon={GitCompare} onClick={compare} className={inComp ? "text-primary bg-primary/10" : undefined} disabled={!inComp && !canAddToCompare} pressed={inComp} />
      <TableAction label="Coleção" icon={FolderPlus} onClick={variantAction('collection')} className="text-muted-foreground hover:text-foreground" />
      <TableAction label="Compartilhar" icon={Share2} onClick={variantAction('share')} className="text-muted-foreground hover:text-foreground" />
      <TableAction label="Orçamento" icon={FileText} onClick={variantAction('quote')} className="text-muted-foreground hover:text-foreground" />

      {/* Carrinho */}
      <QuickAddToQuote
        productId={product.id} productName={product.name} productSku={product.sku}
        productImageUrl={product.og_image_url || product.images[0]} productPrice={product.price}
        minQuantity={product.minQuantity || 1} variant="icon" className="h-7 w-7"
      />

      <TableAction label="Quick View" icon={Eye} onClick={quickView} className="text-muted-foreground hover:text-foreground" />
    </div>
  );
}
