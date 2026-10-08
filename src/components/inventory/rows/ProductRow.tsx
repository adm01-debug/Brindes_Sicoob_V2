
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type ProductStockSummary } from '@/types/stock';
import { StockStatusBadge, StockProgressBar } from '../StockUI';

interface ProductRowProps {
  product: ProductStockSummary;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ProductRow({ product, isExpanded, onToggle }: ProductRowProps) {
  return (
    <TableRow className={cn("cursor-pointer hover:bg-muted/50 transition-colors group", isExpanded && "bg-muted/30")} onClick={onToggle}>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label={isExpanded ? `Recolher ${product.productName}` : `Expandir ${product.productName}`} className="h-6 w-6">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <div className="flex flex-col">
            <span className="font-medium truncate max-w-[200px]">{product.productName}</span>
            <span className="text-xs text-muted-foreground">{product.productSku} • {product.totalVariants} {product.totalVariants === 1 ? 'variação' : 'variações'}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell" />
      <TableCell>
        <div className="flex flex-col">
          <span className="font-semibold">{product.totalCurrentStock}</span>
          <span className="text-[10px] text-muted-foreground">/ {product.totalMinStock} mín</span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <StockProgressBar current={product.totalCurrentStock} min={product.totalMinStock} />
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {product.totalReservedStock > 0 ? (
          <span className="text-sm text-warning">-{product.totalReservedStock}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <span className="font-semibold">{product.totalAvailableStock}</span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {product.totalInTransitStock > 0 ? (
          <span className="text-sm text-primary/80">+{product.totalInTransitStock}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <StockStatusBadge status={product.overallStatus} />
      </TableCell>
      <TableCell className="hidden sm:table-cell" />
    </TableRow>
  );
}
