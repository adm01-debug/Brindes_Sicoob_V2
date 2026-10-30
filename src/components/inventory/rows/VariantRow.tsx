
import { Clock, Truck } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type VariantStock } from '@/types/stock';
import { StockStatusBadge, ColorSwatch, StockProgressBar } from '../StockUI';

interface VariantRowProps {
  variant: VariantStock;
  isNested?: boolean;
}

const DESTRUCTIVE_TEXT = "text-destructive";

function currentStockColor(variant: VariantStock) {
  if (variant.currentStock <= 0) return DESTRUCTIVE_TEXT;
  if (variant.currentStock <= variant.minStock * 0.25) return DESTRUCTIVE_TEXT;
  if (variant.currentStock <= variant.minStock) return "text-warning";
  return "text-foreground";
}

function ReservedCell({ variant }: { variant: VariantStock }) {
  if (variant.reservedStock <= 0) return <span className="text-muted-foreground">-</span>;
  return <TooltipProvider><Tooltip><TooltipTrigger><span className="text-sm text-warning">-{variant.reservedStock}</span></TooltipTrigger><TooltipContent><p>{variant.reservedStock} unidades reservadas em pedidos</p></TooltipContent></Tooltip></TooltipProvider>;
}

function TransitCell({ variant }: { variant: VariantStock }) {
  if (variant.inTransitStock <= 0) return <span className="text-muted-foreground">-</span>;
  return <TooltipProvider><Tooltip><TooltipTrigger><span className="text-sm text-primary/80 flex items-center gap-1"><Truck className="h-3 w-3" />+{variant.inTransitStock}</span></TooltipTrigger><TooltipContent><p>{variant.inTransitStock} unidades em trânsito</p></TooltipContent></Tooltip></TooltipProvider>;
}

function stockoutColor(days: number) {
  if (days <= 7) return DESTRUCTIVE_TEXT;
  if (days <= 14) return "text-warning";
  return "text-muted-foreground";
}

function StockoutCell({ days }: { days?: number }) {
  if (days === undefined) return <span className="text-muted-foreground">-</span>;
  return <TooltipProvider><Tooltip><TooltipTrigger><div className={cn("flex items-center gap-1 text-sm", stockoutColor(days))}><Clock className="h-3 w-3" />{days}d</div></TooltipTrigger><TooltipContent><p>Previsão de esgotamento em {days} dias</p></TooltipContent></Tooltip></TooltipProvider>;
}

export function VariantRow({ variant, isNested = false }: VariantRowProps) {
  return (
    <TableRow className={cn(isNested && "bg-muted/30")}>
      <TableCell className={cn(isNested && "pl-12")}>
        <ColorSwatch hex={variant.colorHex} name={variant.colorName} />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-xs font-mono text-muted-foreground">
          {variant.variantSku}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className={cn("font-semibold", currentStockColor(variant))}>
            {variant.currentStock}
          </span>
          <span className="text-xs text-muted-foreground">
            / {variant.minStock} mín
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <StockProgressBar current={variant.currentStock} min={variant.minStock} max={variant.maxStock} />
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <ReservedCell variant={variant} />
      </TableCell>
      <TableCell>
        <span className={cn("font-medium", variant.availableStock <= 0 ? "text-destructive" : "text-foreground")}>
          {variant.availableStock}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <TransitCell variant={variant} />
      </TableCell>
      <TableCell><StockStatusBadge status={variant.status} /></TableCell>
      <TableCell className="hidden sm:table-cell">
        <StockoutCell days={variant.daysUntilStockout} />
      </TableCell>
    </TableRow>
  );
}
