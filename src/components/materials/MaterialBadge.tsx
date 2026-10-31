import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MaterialBadgeProps {
  name: string;
  groupName?: string;
  hexCode?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "solid" | "ghost";
  showGroup?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  showTooltip?: boolean;
  productCount?: number;
}

type BadgeSize = NonNullable<MaterialBadgeProps["size"]>;
type BadgeVariant = NonNullable<MaterialBadgeProps["variant"]>;

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "text-[11px] px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
  lg: "text-sm px-3 py-1.5 gap-2",
};
const TEXT_WIDTHS: Record<BadgeSize, string> = { sm: "max-w-[100px]", md: "max-w-[120px]", lg: "max-w-[150px]" };
const COUNT_CLASSES: Record<BadgeSize, string> = { sm: "text-[9px] px-1", md: "text-[10px] px-1.5", lg: "text-xs px-2" };
const REMOVE_CLASSES: Record<BadgeSize, string> = { sm: "p-0.5 ml-0.5", md: "p-0.5 ml-1", lg: "p-1 ml-1" };
const ICON_CLASSES: Record<BadgeSize, string> = { sm: "w-2.5 h-2.5", md: "w-3 h-3", lg: "w-3.5 h-3.5" };
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-muted/60 text-muted-foreground hover:bg-muted",
  outline: "border border-border bg-background text-foreground hover:bg-muted/50",
  solid: "bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted/50",
};

function ProductCounter({ count, size }: { count?: number; size: BadgeSize }) {
  if (count === undefined || count <= 0) return null;
  return <span className={cn("rounded-full bg-background/80 text-muted-foreground font-normal", COUNT_CLASSES[size])}>{count}</span>;
}

function RemoveButton({ onRemove, size }: { onRemove?: () => void; size: BadgeSize }) {
  if (!onRemove) return null;
  const handleClick = (event: MouseEvent) => { event.stopPropagation(); onRemove(); };
  return <button type="button" onClick={handleClick} className={cn("rounded-full transition-all duration-150 hover:bg-destructive/20 hover:text-destructive", REMOVE_CLASSES[size])}><X className={ICON_CLASSES[size]} /></button>;
}

function BadgeContent(props: MaterialBadgeProps & { size: BadgeSize; variant: BadgeVariant }) {
  const displayText = props.showGroup && props.groupName ? `${props.groupName}: ${props.name}` : props.name;
  return <span className={cn("inline-flex items-center rounded-full font-medium transition-all duration-200", SIZE_CLASSES[props.size], VARIANT_CLASSES[props.variant], props.onClick && "cursor-pointer", props.onRemove && "pr-1", props.className)} onClick={props.onClick}><span className={cn("truncate", TEXT_WIDTHS[props.size])}>{displayText}</span><ProductCounter count={props.productCount} size={props.size} /><RemoveButton onRemove={props.onRemove} size={props.size} /></span>;
}

function BadgeTooltip({ props, children }: { props: MaterialBadgeProps; children: ReactNode }) {
  return <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent side="top" className="text-xs"><div className="flex flex-col gap-0.5">{props.groupName && <span className="font-medium">{props.groupName}</span>}<span>{props.name}</span>{props.productCount !== undefined && <span className="text-muted-foreground">{props.productCount} produto{props.productCount !== 1 ? "s" : ""}</span>}</div></TooltipContent></Tooltip></TooltipProvider>;
}

export function MaterialBadge(props: MaterialBadgeProps) {
  const size = props.size ?? "md";
  const variant = props.variant ?? "default";
  const content = <BadgeContent {...props} size={size} variant={variant} />;
  const needsTooltip = (props.showTooltip ?? true) && Boolean(props.groupName || props.productCount);
  return needsTooltip ? <BadgeTooltip props={props}>{content}</BadgeTooltip> : content;
}

// Variante compacta para listas
export function CompactMaterialBadge({ name, isSelected, onClick }: {
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
      <span className="truncate max-w-[80px]">{name}</span>
    </button>
  );
}
