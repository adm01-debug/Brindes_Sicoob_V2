import React, { type ForwardedRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RamoAtividadeBadgeProps {
  name: string;
  ramoName?: string;
  hexCode?: string | null;
  icon?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "solid" | "ghost";
  showRamo?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  showTooltip?: boolean;
  productCount?: number;
}

const SIZE_CLASSES = { sm: "text-[11px] px-2 py-0.5 gap-1", md: "text-xs px-2.5 py-1 gap-1.5", lg: "text-sm px-3 py-1.5 gap-2" };
const VARIANT_CLASSES = {
  default: "bg-muted/60 text-muted-foreground hover:bg-muted",
  outline: "border border-border bg-background text-foreground hover:bg-muted/50",
  solid: "bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted/50",
};
const TEXT_SIZE_CLASSES = { sm: "max-w-[100px]", md: "max-w-[140px]", lg: "max-w-[180px]" };
const COUNT_SIZE_CLASSES = { sm: "text-[9px] px-1", md: "text-[10px] px-1.5", lg: "text-xs px-2" };
const REMOVE_SIZE_CLASSES = { sm: "p-0.5 ml-0.5", md: "p-0.5 ml-1", lg: "p-1 ml-1" };
const ICON_SIZE_CLASSES = { sm: "w-2.5 h-2.5", md: "w-3 h-3", lg: "w-3.5 h-3.5" };

function ProductCount({ count, size }: { count?: number; size: "sm" | "md" | "lg" }) {
  if (!count || count <= 0) return null;
  return <span className={cn("rounded-full bg-background/80 text-muted-foreground font-normal", COUNT_SIZE_CLASSES[size])}>{count}</span>;
}

function RemoveButton({ size, onRemove }: { size: "sm" | "md" | "lg"; onRemove?: () => void }) {
  if (!onRemove) return null;
  return <button type="button" onClick={event => { event.stopPropagation(); onRemove(); }} className={cn("rounded-full transition-all duration-150 hover:bg-destructive/20 hover:text-destructive", REMOVE_SIZE_CLASSES[size])}><X className={ICON_SIZE_CLASSES[size]} /></button>;
}

function BadgeContent({ badgeRef, name, ramoName, size, variant, showRamo, onClick, onRemove, className, productCount }: { badgeRef: ForwardedRef<HTMLSpanElement>; name: string; ramoName?: string; size: "sm" | "md" | "lg"; variant: "default" | "outline" | "solid" | "ghost"; showRamo: boolean; onClick?: () => void; onRemove?: () => void; className?: string; productCount?: number }) {
  const displayText = showRamo && ramoName ? `${ramoName} → ${name}` : name;
  return <span ref={badgeRef} className={cn("inline-flex items-center rounded-full font-medium transition-all duration-200", SIZE_CLASSES[size], VARIANT_CLASSES[variant], onClick && "cursor-pointer", onRemove && "pr-1", className)} onClick={onClick}><span className={cn("truncate", TEXT_SIZE_CLASSES[size])}>{displayText}</span><ProductCount count={productCount} size={size} /><RemoveButton size={size} onRemove={onRemove} /></span>;
}

function BadgeTooltip({ content, name, ramoName, productCount }: { content: React.ReactNode; name: string; ramoName?: string; productCount?: number }) {
  return <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild>{content}</TooltipTrigger><TooltipContent side="top" className="text-xs"><div className="flex flex-col gap-0.5">{ramoName && <span className="font-medium">{ramoName}</span>}<span>{name}</span>{productCount !== undefined && <span className="text-muted-foreground">{productCount} produto{productCount !== 1 ? "s" : ""}</span>}</div></TooltipContent></Tooltip></TooltipProvider>;
}

export const RamoAtividadeBadge = React.forwardRef<HTMLSpanElement, RamoAtividadeBadgeProps>(
  (
    { name, ramoName, size = "md", variant = "default", showRamo = false, onClick, onRemove, className, showTooltip = true, productCount },
    ref
  ) => {
    const badgeContent = <BadgeContent badgeRef={ref} name={name} ramoName={ramoName} size={size} variant={variant} showRamo={showRamo} onClick={onClick} onRemove={onRemove} className={className} productCount={productCount} />;
    if (showTooltip && (ramoName || productCount)) {
      return <BadgeTooltip content={badgeContent} name={name} ramoName={ramoName} productCount={productCount} />;
    }

    return badgeContent;
  }
);

RamoAtividadeBadge.displayName = "RamoAtividadeBadge";


// Variante compacta para listas
export function CompactRamoAtividadeBadge({ name, isSelected, onClick }: {
  name: string;
  hexCode?: string | null;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all duration-150",
        isSelected
          ? "bg-primary/15 text-primary font-medium ring-1 ring-primary/30"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className="truncate max-w-[100px]">{name}</span>
    </button>
  );
}
