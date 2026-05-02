import React from "react";
import { cn } from "@/lib/utils";
import { X, Building2 } from "lucide-react";
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

export const RamoAtividadeBadge = React.forwardRef<HTMLSpanElement, RamoAtividadeBadgeProps>(
  (
    {
      name,
      ramoName,
      hexCode,
      icon,
      size = "md",
      variant = "default",
      showRamo = false,
      onClick,
      onRemove,
      className,
      showTooltip = true,
      productCount,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "text-[11px] px-2 py-0.5 gap-1",
      md: "text-xs px-2.5 py-1 gap-1.5",
      lg: "text-sm px-3 py-1.5 gap-2",
    };

    const variantClasses = {
      default: "bg-muted/60 text-muted-foreground hover:bg-muted",
      outline:
        "border border-border bg-background text-foreground hover:bg-muted/50",
      solid:
        "bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25",
      ghost: "bg-transparent text-muted-foreground hover:bg-muted/50",
    };

    const displayText = showRamo && ramoName ? `${ramoName} → ${name}` : name;

    const badgeContent = (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full font-medium transition-all duration-200",
          sizeClasses[size],
          variantClasses[variant],
          onClick && "cursor-pointer",
          onRemove && "pr-1",
          className
        )}
        onClick={onClick}
        {...props}
      >
        {/* Texto */}
        <span
          className={cn(
            "truncate",
            size === "sm" && "max-w-[100px]",
            size === "md" && "max-w-[140px]",
            size === "lg" && "max-w-[180px]"
          )}
        >
          {displayText}
        </span>

        {/* Contador de produtos */}
        {productCount !== undefined && productCount > 0 && (
          <span
            className={cn(
              "rounded-full bg-background/80 text-muted-foreground font-normal",
              size === "sm" && "text-[9px] px-1",
              size === "md" && "text-[10px] px-1.5",
              size === "lg" && "text-xs px-2"
            )}
          >
            {productCount}
          </span>
        )}

        {/* Botão remover */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={cn(
              "rounded-full transition-all duration-150 hover:bg-destructive/20 hover:text-destructive",
              size === "sm" && "p-0.5 ml-0.5",
              size === "md" && "p-0.5 ml-1",
              size === "lg" && "p-1 ml-1"
            )}
          >
            <X
              className={cn(
                size === "sm" && "w-2.5 h-2.5",
                size === "md" && "w-3 h-3",
                size === "lg" && "w-3.5 h-3.5"
              )}
            />
          </button>
        )}
      </span>
    );

    // Com tooltip
    if (showTooltip && (ramoName || productCount)) {
      return (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="flex flex-col gap-0.5">
                {ramoName && <span className="font-medium">{ramoName}</span>}
                <span>{name}</span>
                {productCount !== undefined && (
                  <span className="text-muted-foreground">
                    {productCount} produto{productCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badgeContent;
  }
);

RamoAtividadeBadge.displayName = "RamoAtividadeBadge";


// Variante compacta para listas
export function CompactRamoAtividadeBadge({
  name,
  hexCode,
  isSelected,
  onClick,
}: {
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
