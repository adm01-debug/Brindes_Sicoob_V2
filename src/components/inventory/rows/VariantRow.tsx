
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
          <span className={cn(
            "font-semibold",
            variant.currentStock <= 0 ? "text-destructive" :
            variant.currentStock <= variant.minStock * 0.25 ? "text-destructive" :
            variant.currentStock <= variant.minStock ? "text-warning" :
            "text-foreground"
          )}>
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
        {variant.reservedStock > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm text-warning">-{variant.reservedStock}</span>
              </TooltipTrigger>
              <TooltipContent><p>{variant.reservedStock} unidades reservadas em pedidos</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <span className={cn("font-medium", variant.availableStock <= 0 ? "text-destructive" : "text-foreground")}>
          {variant.availableStock}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {variant.inTransitStock > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm text-primary/80 flex items-center gap-1">
                  <Truck className="h-3 w-3" />+{variant.inTransitStock}
                </span>
              </TooltipTrigger>
              <TooltipContent><p>{variant.inTransitStock} unidades em trânsito</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell><StockStatusBadge status={variant.status} /></TableCell>
      <TableCell className="hidden sm:table-cell">
        {variant.daysUntilStockout !== undefined ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className={cn(
                  "flex items-center gap-1 text-sm",
                  variant.daysUntilStockout <= 7 ? "text-destructive" :
                  variant.daysUntilStockout <= 14 ? "text-warning" :
                  "text-muted-foreground"
                )}>
                  <Clock className="h-3 w-3" />{variant.daysUntilStockout}d
                </div>
              </TooltipTrigger>
              <TooltipContent><p>Previsão de esgotamento em {variant.daysUntilStockout} dias</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}
