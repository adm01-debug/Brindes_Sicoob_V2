/**
 * ProductCardActions — FAB action buttons for ProductCard.
 * Extracted to reduce ProductCard.tsx size.
 */
import { type ComponentType, type MouseEvent, memo } from "react";
import { Heart, Share2, Eye, GitCompare, FolderPlus, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QuickAddToQuote } from "./QuickAddToQuote";
import { cn } from "@/lib/utils";
import type { VariantActionMode } from "./VariantPickerDialog";

interface ProductCardActionsProps {
  productId: string;
  productName: string;
  productSku?: string;
  productImageUrl?: string;
  productPrice: number;
  productMinQuantity: number;
  isFavorited: boolean;
  isInCompare: boolean;
  canAddToCompare: boolean;
  actionsOpen: boolean;
  onToggleActions: () => void;
  onFavorite: (e: MouseEvent) => void;
  onCompare: (e: MouseEvent) => void;
  onOpenVariantPicker: (mode: VariantActionMode) => void;
  onQuickView: () => void;
  markBusy: () => void;
}

function FavoriteAction({
  isFavorited,
  btnClass,
  onFavorite,
}: Pick<ProductCardActionsProps, "isFavorited" | "onFavorite"> & { btnClass: string }) {
  return (
    <ActionButton
      icon={Heart}
      label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      testId="product-card-favorite"
      ariaPressed={isFavorited}
      className={cn(btnClass, isFavorited && "bg-destructive/10 border-destructive/30")}
      iconClassName={cn(isFavorited && "fill-destructive text-destructive scale-110 animate-heart-fill")}
      onClick={onFavorite}
    />
  );
}

function CompareAction({
  isInCompare,
  canAddToCompare,
  btnClass,
  onCompare,
}: Pick<ProductCardActionsProps, "isInCompare" | "canAddToCompare" | "onCompare"> & { btnClass: string }) {
  return (
    <ActionButton
      icon={GitCompare}
      label={isInCompare ? "Remover da comparação" : "Adicionar à comparação"}
      className={cn(btnClass, isInCompare && "bg-sicoob-green/10 border-sicoob-green/30")}
      iconClassName={cn(isInCompare && "text-sicoob-green scale-110")}
      disabled={!isInCompare && !canAddToCompare}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onCompare(event);
      }}
    />
  );
}

function ActionsToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return <button type="button" data-testid="product-card-actions-toggle" data-actions-open={open ? "true" : "false"} className={cn("flex items-center justify-center h-9 w-9 md:h-11 md:w-11 rounded-full shadow-lg", "transition-all duration-300 ease-out min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", open ? "bg-muted text-muted-foreground rotate-45" : "bg-sicoob-green/60 text-white hover:bg-sicoob-green/80")} onClick={(event) => { event.stopPropagation(); onToggle(); }} aria-label={open ? "Fechar ações" : "Ações rápidas"} aria-expanded={open}><Plus className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-200" /></button>;
}

function ExpandedCardActions({ props, btnClass }: { props: ProductCardActionsProps; btnClass: string }) {
  const { productId, productName, productSku, productImageUrl, productPrice, productMinQuantity, isFavorited, isInCompare, canAddToCompare, actionsOpen, onFavorite, onCompare, onOpenVariantPicker, onQuickView, markBusy } = props;
  const open = (mode: VariantActionMode, preventDefault = false) => (event: MouseEvent) => { event.stopPropagation(); if (preventDefault) event.preventDefault(); markBusy(); onOpenVariantPicker(mode); };
  return (
    <div className={cn("flex flex-col gap-2 transition-all duration-300 ease-out origin-top", actionsOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-75 -translate-y-4 pointer-events-none")}>
      <FavoriteAction isFavorited={isFavorited} btnClass={btnClass} onFavorite={onFavorite} />
      <CompareAction isInCompare={isInCompare} canAddToCompare={canAddToCompare} btnClass={btnClass} onCompare={onCompare} />
      <ActionButton icon={FolderPlus} label="Adicionar à coleção" className={btnClass} ariaHasPopup="dialog" onClick={open('collection')} />
      <ActionButton icon={Share2} label="Compartilhar" className={btnClass} ariaHasPopup="dialog" onClick={open('share', true)} />
      <ActionButton icon={FileText} label="Gerar Orçamento" className={btnClass} onClick={open('quote')} />
      <QuickAddToQuote productId={productId} productName={productName} productSku={productSku} productImageUrl={productImageUrl} productPrice={productPrice} minQuantity={productMinQuantity} variant="icon" className="h-9 w-9 md:h-11 md:w-11 min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]" />
      <ActionButton icon={Eye} label="Visualização Rápida" className={btnClass} ariaHasPopup="dialog" onClick={(event) => { event.stopPropagation(); markBusy(); onQuickView(); }} />
    </div>
  );
}

export const ProductCardActions = memo(function ProductCardActions({
  productId, productName, productSku, productImageUrl, productPrice, productMinQuantity,
  isFavorited, isInCompare, canAddToCompare,
  actionsOpen, onToggleActions, onFavorite, onCompare,
  onOpenVariantPicker, onQuickView, markBusy,
}: ProductCardActionsProps) {
  const btnClass = "h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200 min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]";
  const props = { productId, productName, productSku, productImageUrl, productPrice, productMinQuantity, isFavorited, isInCompare, canAddToCompare, actionsOpen, onToggleActions, onFavorite, onCompare, onOpenVariantPicker, onQuickView, markBusy };

  return (
    <div
      className={cn(
        "absolute top-3 right-3 flex flex-col items-end gap-2 z-30",
        "transition-all duration-300 ease-out",
        "opacity-100 translate-x-0 md:opacity-0 md:translate-x-4",
        "md:group-hover:opacity-100 md:group-hover:translate-x-0",
      )}
    >
      <ActionsToggle open={actionsOpen} onToggle={onToggleActions} />
      <ExpandedCardActions props={props} btnClass={btnClass} />
    </div>
  );
});

// Tiny helper to reduce repetition
function ActionButton({
  icon, label, className, iconClassName, disabled, onClick, testId, ariaPressed, ariaHasPopup,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string; className?: string; iconClassName?: string;
  disabled?: boolean; onClick: (e: MouseEvent) => void;
  testId?: string;
  ariaPressed?: boolean;
  ariaHasPopup?: "dialog" | "menu" | "listbox" | "tree" | "grid";
}) {
  const IconComponent = icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="secondary" size="icon" className={className} disabled={disabled}
          onClick={onClick} aria-label={label}
          data-testid={testId}
          aria-pressed={ariaPressed}
          aria-haspopup={ariaHasPopup}>
          <IconComponent className={cn("h-4 w-4 md:h-5 md:w-5 transition-all duration-300", iconClassName)} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}
