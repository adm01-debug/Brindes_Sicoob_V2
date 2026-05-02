import { Package, AlertTriangle, XCircle, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'pre-order' | 'incoming';

interface StockBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StockStatus;
  quantity?: number;
  showQuantity?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  expectedDate?: string;
}

// ... keep existing code
export const StockBadge = React.forwardRef<HTMLDivElement, StockBadgeProps>(
  (
    {
      status,
      quantity,
      showQuantity = false,
      showIcon = true,
      size = 'md',
      expectedDate,
      className,
      ...props
    },
    ref
  ) => {
    const config = statusConfig[status];
    const sizeStyles = sizeConfig[size];
    const Icon = config.icon;

    const formatQuantity = (qty: number) => {
      if (qty >= 1000) {
        return `${(qty / 1000).toFixed(1)}k`;
      }
      return qty.toLocaleString('pt-BR');
    };

    const badgeContent = (
      <Badge
        ref={ref}
        variant="outline"
        className={cn(
          'font-medium inline-flex items-center border transition-all',
          config.bgClass,
          config.className,
          sizeStyles.badge,
          className
        )}
        {...props}
      >
        {showIcon && <Icon className={sizeStyles.icon} />}
        <span>
          {showQuantity && quantity !== undefined ? (
            <>{formatQuantity(quantity)} un.</>
          ) : (
            config.shortLabel
          )}
        </span>
      </Badge>
    );

    // Se tem informação adicional, mostrar tooltip
    if (expectedDate || (quantity !== undefined && !showQuantity)) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-medium">{config.label}</p>
              {quantity !== undefined && (
                <p>Quantidade: {quantity.toLocaleString('pt-BR')} unidades</p>
              )}
              {expectedDate && (
                <p>Previsão: {new Date(expectedDate).toLocaleDateString('pt-BR')}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return badgeContent;
  }
);

StockBadge.displayName = "StockBadge";


  // Se tem informação adicional, mostrar tooltip
  if (expectedDate || (quantity !== undefined && !showQuantity)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">{config.label}</p>
            {quantity !== undefined && (
              <p>Quantidade: {quantity.toLocaleString('pt-BR')} unidades</p>
            )}
            {expectedDate && (
              <p>Previsão: {new Date(expectedDate).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badgeContent;
}

// Função helper para determinar status com base na quantidade
export function getStockStatus(quantity: number, lowThreshold = 50): StockStatus {
  if (quantity === 0) return 'out-of-stock';
  if (quantity <= lowThreshold) return 'low-stock';
  return 'in-stock';
}

// Componente de indicador compacto para listas
interface StockIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StockStatus;
}

export const StockIndicator = React.forwardRef<HTMLSpanElement, StockIndicatorProps>(
  ({ status, className, ...props }, ref) => {
    const dotColor = {
      'in-stock': 'bg-primary',
      'low-stock': 'bg-warning',
      'out-of-stock': 'bg-destructive',
      'pre-order': 'bg-primary',
      'incoming': 'bg-primary/70',
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            ref={ref}
            className={cn(
              'inline-block w-2.5 h-2.5 rounded-full',
              dotColor[status],
              status === 'low-stock' && 'animate-pulse',
              className
            )}
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent>{statusConfig[status].label}</TooltipContent>
      </Tooltip>
    );
  }
);

StockIndicator.displayName = "StockIndicator";

