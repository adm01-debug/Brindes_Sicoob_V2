import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isLightColor } from "@/hooks/useColorSystem";

// =====================================================
// TIPOS
// =====================================================

export interface ProductColor {
  id?: string;
  name: string;
  hex: string;
  variationName?: string;  // "Azul Royal"
  nuanceName?: string;     // "Metalizado"
  groupName?: string;      // "Azul"
  groupHex?: string;       // Para fallback
  groupSlug?: string;
}

interface ProductColorSelectorProps {
  colors: ProductColor[];
  selectedColorId?: string | null;
  onColorSelect?: (color: ProductColor) => void;
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const SWATCH_SIZES = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-10 h-10" };
const CHECK_SIZES = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" };

function formatColorName(color: ProductColor): string {
  if (color.variationName && color.nuanceName) return `${color.variationName} ${color.nuanceName}`;
  return color.variationName ?? color.name;
}

function SelectedColorLabel({ color }: { color: ProductColor }) {
  return <motion.div key={color.id || color.name} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="flex items-center gap-2 pt-1"><span className="w-4 h-4 rounded-full border border-border shadow-sm" style={{ backgroundColor: color.hex }} /><span className="text-sm font-medium text-foreground">{formatColorName(color)}</span>{color.nuanceName && <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full"><Sparkles className="h-3 w-3" />{color.nuanceName}</span>}</motion.div>;
}

function ColorSelectorLabel({ count, color }: { count: number; color?: ProductColor }) {
  return <div className="flex items-center justify-between"><p className="text-sm font-medium text-foreground">Cores disponíveis ({count})</p><AnimatePresence mode="wait">{color && <motion.span key={color.id || color.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="text-sm text-muted-foreground flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: color.hex }} />{formatColorName(color)}{color.nuanceName && <Sparkles className="h-3 w-3 text-primary/60" />}</motion.span>}</AnimatePresence></div>;
}

function resolveColorHex(color: ProductColor): string {
  return color.hex || color.groupHex || "#CCCCCC";
}

function getSwatchAnimation(selected: boolean, colorHex: string) {
  const shadow = `0 0 12px 3px ${colorHex}80, 0 0 20px 6px ${colorHex}40`;
  const pulse = [shadow, `0 0 16px 5px ${colorHex}90, 0 0 24px 8px ${colorHex}50`, shadow];
  return {
    shadow: selected ? shadow : undefined,
    animate: selected ? { boxShadow: pulse } : {},
    transition: selected ? { boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" } } : {},
  };
}

function ColorTooltipLabel({ color }: { color: ProductColor }) {
  const showGroup = Boolean(color.groupName && color.groupName !== color.variationName);
  return <div className="text-center"><p>{formatColorName(color)}</p>{showGroup && <p className="text-xs text-muted-foreground">Grupo: {color.groupName}</p>}</div>;
}

function ColorSwatch({ color, selected, size, onSelect, onHover }: { color: ProductColor; selected: boolean; size: "sm" | "md" | "lg"; onSelect: () => void; onHover: (color: ProductColor | null) => void }) {
  const colorHex = resolveColorHex(color);
  const isWhite = ["#FFFFFF", "#FFF"].includes(colorHex.toUpperCase());
  const animation = getSwatchAnimation(selected, colorHex);
  const checkColor = isLightColor(colorHex) ? "text-foreground" : "text-primary-foreground";
  return <Tooltip delayDuration={200}><TooltipTrigger asChild><motion.button onClick={onSelect} onMouseEnter={() => onHover(color)} onMouseLeave={() => onHover(null)} className={cn("rounded-full cursor-pointer relative transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", SWATCH_SIZES[size], selected && "ring-2 ring-primary ring-offset-2 ring-offset-background")} style={{ backgroundColor: colorHex, border: isWhite ? "2px solid hsl(var(--border))" : "2px solid transparent", boxShadow: animation.shadow }} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }} animate={animation.animate} transition={animation.transition}>{selected && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 flex items-center justify-center"><Check className={cn(CHECK_SIZES[size], checkColor)} strokeWidth={3} /></motion.div>}</motion.button></TooltipTrigger><TooltipContent side="top" className="font-medium"><ColorTooltipLabel color={color} /></TooltipContent></Tooltip>;
}

function HiddenColors({ count, size }: { count: number; size: "sm" | "md" | "lg" }) {
  if (count <= 0) return null;
  return <Tooltip><TooltipTrigger asChild><motion.div className={cn("rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground cursor-default", SWATCH_SIZES[size])} whileHover={{ scale: 1.05 }}>+{count}</motion.div></TooltipTrigger><TooltipContent>Mais {count} {count === 1 ? "cor" : "cores"}</TooltipContent></Tooltip>;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function ProductColorSelector({
  colors,
  selectedColorId,
  onColorSelect,
  maxVisible = 8,
  size = "md",
  showLabel = true,
  className,
}: ProductColorSelectorProps) {
  const [hoveredColor, setHoveredColor] = useState<ProductColor | null>(null);

  const visibleColors = colors.slice(0, maxVisible);
  const hiddenCount = colors.length - maxVisible;
  const selectedColor = colors.find(c => c.id === selectedColorId);
  const displayColor = hoveredColor || selectedColor;

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && <ColorSelectorLabel count={colors.length} color={displayColor} />}
      <div className="flex flex-wrap gap-2">
        {visibleColors.map((color, index) => <ColorSwatch key={color.id || index} color={color} selected={selectedColorId === color.id} size={size} onSelect={() => onColorSelect?.(color)} onHover={setHoveredColor} />)}
        <HiddenColors count={hiddenCount} size={size} />
      </div>
      <AnimatePresence mode="wait">{selectedColor && <SelectedColorLabel color={selectedColor} />}</AnimatePresence>
    </div>
  );
}

// =====================================================
// VERSÃO COMPACTA PARA CARDS
// =====================================================

interface CompactColorDotsProps {
  colors: ProductColor[];
  maxVisible?: number;
  size?: "xs" | "sm";
}

export function CompactColorDots({
  colors,
  maxVisible = 5,
  size = "sm",
}: CompactColorDotsProps) {
  const visibleColors = colors.slice(0, maxVisible);
  const hiddenCount = colors.length - maxVisible;

  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
  };

  return (
    <div className="flex items-center gap-1">
      {visibleColors.map((color, idx) => (
        <Tooltip key={color.id || idx} delayDuration={300}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "rounded-full border",
                sizeClasses[size],
                color.hex?.toUpperCase() === "#FFFFFF" 
                  ? "border-border" 
                  : "border-transparent"
              )}
              style={{ backgroundColor: color.hex || "#CCCCCC" }}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {color.variationName || color.name}
            {color.nuanceName && ` ${color.nuanceName}`}
          </TooltipContent>
        </Tooltip>
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground font-medium">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
